import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminEmailSet, getEnv } from "@/lib/env";
import { sendMagicLink } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { generateRandomToken, sha256Hex } from "@/lib/security";
import { adminAccessRequestSchema } from "@/lib/validation";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown";
  }
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function genericRedirect(request: NextRequest) {
  const url = new URL("/admin/login?mail=1", request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const env = getEnv();
  const formData = await request.formData();

  // Honeypot: bots tend to fill every field, humans never see this one.
  if (formData.get("website")) {
    return genericRedirect(request);
  }

  const input = adminAccessRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!input.success) {
    return genericRedirect(request);
  }

  const { email } = input.data;

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`admin-mail:${ip}`, 5, 30 * 60 * 1000);
  const emailLimit = rateLimit(`admin-mail:${email}`, 5, 30 * 60 * 1000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    console.warn(`[admin-request-link] rate limited ip=${ip}`);
    return genericRedirect(request);
  }

  if (!adminEmailSet().has(email)) {
    // Same generic response as a valid request to avoid allowlist enumeration.
    return genericRedirect(request);
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

  return genericRedirect(request);
}
