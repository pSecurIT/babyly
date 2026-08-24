import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminEmailSet } from "@/lib/env";
import { createSessionValue } from "@/lib/session";
import { sha256Hex } from "@/lib/security";

function safeNextPath(input: string | null): string {
  if (!input) {
    return "/";
  }
  if (!input.startsWith("/")) {
    return "/";
  }
  if (input.startsWith("//")) {
    return "/";
  }
  return input;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const emailRaw = url.searchParams.get("email");
  const nameRaw = url.searchParams.get("name") ?? "";
  const scope = url.searchParams.get("scope");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!token || !emailRaw || (scope !== "guest" && scope !== "admin")) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const failureRedirect = scope === "admin" ? "/admin/login?auth=failed" : "/?auth=failed";
  const email = emailRaw.toLowerCase().trim();
  const purpose = scope === "admin" ? "admin_login" : "guest_login";
  const tokenHash = sha256Hex(token);

  const tokenRecord = await prisma.magicLinkToken.findFirst({
    where: {
      email,
      purpose,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord) {
    return NextResponse.redirect(new URL(failureRedirect, request.url));
  }

  const consumed = await prisma.magicLinkToken.updateMany({
    where: {
      id: tokenRecord.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  if (consumed.count !== 1) {
    return NextResponse.redirect(new URL(failureRedirect, request.url));
  }

  if (scope === "admin") {
    const allowlist = adminEmailSet();
    if (!allowlist.has(email)) {
      return NextResponse.redirect(new URL(failureRedirect, request.url));
    }

    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set("baby_session", createSessionValue(email, "admin", 60 * 60), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  }

  const participantName = nameRaw.trim();

  const participant = await prisma.participant.upsert({
    where: { email },
    update: {
      emailVerifiedAt: new Date(),
      ...(participantName ? { name: participantName } : {}),
    },
    create: {
      email,
      name: participantName || null,
      emailVerifiedAt: new Date(),
    },
  });

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set("baby_session", createSessionValue(participant.id, "guest", 60 * 60 * 8), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
