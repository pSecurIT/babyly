import { cookies } from "next/headers";
import { generateRandomToken, safeEqualHex, sha256Hex } from "@/lib/security";

export const CSRF_COOKIE = "baby_csrf";

function isToken(value: string | undefined): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;
  if (isToken(existing)) {
    return existing;
  }

  return generateRandomToken();
}

export function isValidCsrfToken(formToken: string | null, cookieToken: string | undefined): boolean {
  if (!formToken || !isToken(formToken) || !isToken(cookieToken)) {
    return false;
  }

  return safeEqualHex(sha256Hex(formToken), sha256Hex(cookieToken));
}

export async function validateCsrfToken(formToken: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidCsrfToken(formToken, cookieStore.get(CSRF_COOKIE)?.value);
}

export function csrfTokenFromForm(formData: FormData): string | null {
  const value = formData.get("csrfToken");
  return typeof value === "string" ? value : null;
}