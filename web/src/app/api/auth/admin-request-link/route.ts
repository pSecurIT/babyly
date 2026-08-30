import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminEmailSet, getEnv } from "@/lib/env";
import { sendMagicLink } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { generateRandomToken, sha256Hex } from "@/lib/security";
import { adminAccessRequestSchema } from "@/lib/validation";
import { isValidCsrfToken } from "@/lib/csrf";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown";
  }
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function genericRedirect() {
  const url = new URL("/admin/login?mail=1", getEnv().APP_BASE_URL);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const env = getEnv();
  const formData = await request.formData();
  const csrfToken = formData.get("csrfToken");
  if (!isValidCsrfToken(
    typeof csrfToken === "string" ? csrfToken : null,
    request.cookies.get("baby_csrf")?.value,
  )) {
    return genericRedirect();
  }

  // Honeypot: bots tend to fill every field, humans never see this one.
  if (formData.get("website")) {
    return genericRedirect();
  }

  const input = adminAccessRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!input.success) {
    return genericRedirect();
  }

  const { email } = input.data;

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`admin-mail:${ip}`, 5, 30 * 60 * 1000);
  const emailLimit = rateLimit(`admin-mail:${email}`, 5, 30 * 60 * 1000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    console.warn("[admin-request-link] rate_limited");
    return genericRedirect();
  }

  if (!adminEmailSet().has(email)) {
    // Same generic response as a valid request to avoid allowlist enumeration.
    return genericRedirect();
  }

  const token = generateRandomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + env.MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash,
      purpose: "admin_login",
      expiresAt,
    },
  });

  const verifyUrl = new URL("/api/auth/verify", env.APP_BASE_URL);
  verifyUrl.searchParams.set("token", token);
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("scope", "admin");
  verifyUrl.searchParams.set("next", "/admin");

  await sendMagicLink({ email, link: verifyUrl.toString(), purpose: "admin" });

  return genericRedirect();
}
