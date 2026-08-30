import { NextRequest, NextResponse } from "next/server";
import { isValidAccessCode, syncAccessCodeFromEnv } from "@/lib/access-code";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { sendMagicLink } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { generateRandomToken, sha256Hex } from "@/lib/security";
import { accessRequestSchema } from "@/lib/validation";
import { isValidCsrfToken } from "@/lib/csrf";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown";
  }
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function genericRedirect(request: NextRequest) {
  const url = new URL("/?mail=1", request.url);
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
    console.warn("[request-link] csrf_rejected");
    return genericRedirect(request);
  }
  const input = accessRequestSchema.safeParse({
    accessCode: formData.get("accessCode"),
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!input.success) {
    console.warn("[request-link] input_rejected");
    return genericRedirect(request);
  }

  const { accessCode, name, email } = input.data;

  const ip = getClientIp(request);
  const codeLimit = rateLimit(`code:${ip}`, 15, 10 * 60 * 1000);
  const emailLimit = rateLimit(`mail:${ip}`, 10, 10 * 60 * 1000);
  if (!codeLimit.allowed || !emailLimit.allowed) {
    console.warn("[request-link] rate_limited");
    return genericRedirect(request);
  }

  console.info("[request-link] access_code_check_started");
  await syncAccessCodeFromEnv();
  if (!(await isValidAccessCode(accessCode))) {
    console.warn("[request-link] access_code_rejected");
    return genericRedirect(request);
  }

  console.info("[request-link] access_code_accepted");
  const token = generateRandomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + env.MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await prisma.participant.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      emailVerifiedAt: null,
    },
  });

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash,
      purpose: "guest_login",
      expiresAt,
    },
  });

  console.info("[request-link] token_created");
  const verifyUrl = new URL("/api/auth/verify", env.APP_BASE_URL);
  verifyUrl.searchParams.set("token", token);
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("name", name);
  verifyUrl.searchParams.set("scope", "guest");
  verifyUrl.searchParams.set("next", "/");

  await sendMagicLink({ email, link: verifyUrl.toString(), purpose: "guest" });

  console.info("[request-link] completed");
  return genericRedirect(request);
}
