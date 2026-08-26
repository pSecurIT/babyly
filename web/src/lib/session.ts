import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import { hmacSha256Hex } from "@/lib/security";

type SessionScope = "guest" | "admin";

type SessionPayload = {
  sub: string;
  scope: SessionScope;
  exp: number;
  crossPromptSeen?: {
    predictionToAddress?: boolean;
    addressToPrediction?: boolean;
  };
};

const SESSION_COOKIE = "baby_session";

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof parsed.sub !== "string" ||
      (parsed.scope !== "guest" && parsed.scope !== "admin") ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

function sign(encoded: string): string {
  const env = getEnv();
  return hmacSha256Hex(env.SESSION_SECRET, encoded);
}

export function createSessionValue(
  sub: string,
  scope: SessionScope,
  ttlSeconds: number,
  crossPromptSeen?: SessionPayload["crossPromptSeen"],
): string {
  const payload: SessionPayload = {
    sub,
    scope,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    crossPromptSeen,
  };
  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function parseSessionValue(value: string | undefined): SessionPayload | null {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  if (sign(encoded) !== signature) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function readGuestSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = parseSessionValue(raw);
  if (!parsed || parsed.scope !== "guest") {
    return null;
  }
  return parsed;
}

export async function readAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = parseSessionValue(raw);
  if (!parsed || parsed.scope !== "admin") {
    return null;
  }
  return parsed;
}

export async function persistGuestSession(sub: string) {
  const cookieStore = await cookies();
  const value = createSessionValue(sub, "guest", 60 * 60 * 8);
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function markCrossPromptSeen(
  direction: "predictionToAddress" | "addressToPrediction",
) {
  const session = await readGuestSession();
  if (!session) {
    return;
  }

  const remainingSeconds = Math.max(1, session.exp - Math.floor(Date.now() / 1000));
  const crossPromptSeen = {
    ...session.crossPromptSeen,
    [direction]: true,
  };
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    createSessionValue(session.sub, "guest", remainingSeconds, crossPromptSeen),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remainingSeconds,
    },
  );
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

