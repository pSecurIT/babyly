import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "baby_csrf";
const CSRF_REQUEST_HEADER = "x-baby-csrf-token";

function isValidToken(value: string | undefined): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const existingToken = request.cookies.get(CSRF_COOKIE)?.value;
  const token = isValidToken(existingToken) ? existingToken : generateCsrfToken();
  const shouldSetCookie = token !== existingToken;
  requestHeaders.set(CSRF_REQUEST_HEADER, token);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (shouldSetCookie) {
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};