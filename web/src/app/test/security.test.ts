import { beforeEach, describe, expect, it } from "vitest";

import { adminEmailSet, getEnv } from "@/lib/env";
import { isValidCsrfToken } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { safeEqualHex, sha256Hex } from "@/lib/security";
import { createSessionValue, parseSessionValue } from "@/lib/session";

describe("security en sessies", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/baby";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.ACCESS_CODE = "test-code";
    process.env.SESSION_SECRET = "abcdefghijklmnopqrstuvwx1234567890";
    process.env.MAGIC_LINK_TTL_MINUTES = "1440";
    process.env.EMAIL_DELIVERY_MODE = "console";
    process.env.ADMIN_EMAILS = "parent@example.com, helper@example.com";
    process.env.PRIVACY_CONTACT_EMAIL = "privacy@example.com";
    getEnv();
  });

  it("hashes en vergelijkt tokens op veilige, constante wijze", () => {
    const plain = "geheime-token";
    const hash = sha256Hex(plain);

    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256Hex(plain));
    expect(safeEqualHex(hash, sha256Hex(plain))).toBe(true);
    expect(safeEqualHex(hash, sha256Hex("ander-token"))).toBe(false);
  });

  it("rate limit blokkeert extra pogingen binnen het venster", () => {
    const key = "code:test-user";

    const first = rateLimit(key, 2, 60_000);
    const second = rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("maakt en valideert een ondertekende guest session", () => {
    const sessionValue = createSessionValue("participant-123", "guest", 60 * 60);
    const parsed = parseSessionValue(sessionValue);

    expect(parsed).not.toBeNull();
    expect(parsed?.sub).toBe("participant-123");
    expect(parsed?.scope).toBe("guest");
    expect(parsed?.exp).toBeTypeOf("number");
  });

  it("verwerpt gewijzigde of verlopen sessies", () => {
    const valid = createSessionValue("participant-123", "guest", 60 * 60);
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;

    expect(parseSessionValue(tampered)).toBeNull();

    const expired = createSessionValue("participant-123", "guest", -1);
    expect(parseSessionValue(expired)).toBeNull();
  });

  it("houdt alleen allowlisted admin e-mails toe", () => {
    const allows = adminEmailSet();

    expect(allows.has("parent@example.com")).toBe(true);
    expect(allows.has("helper@example.com")).toBe(true);
    expect(allows.has("stranger@example.com")).toBe(false);
  });

  it("staat magic-link TTL tot 24 uur toe", () => {
    expect(getEnv().MAGIC_LINK_TTL_MINUTES).toBe(1440);
  });

  it("accepteert alleen een CSRF-token dat gelijk is aan de cookie", () => {
    const token = "a".repeat(64);

    expect(isValidCsrfToken(token, token)).toBe(true);
    expect(isValidCsrfToken(null, token)).toBe(false);
    expect(isValidCsrfToken(token, "b".repeat(64))).toBe(false);
  });

  it("staat CSRF-bypass alleen toe voor de expliciete lokale omgeving", () => {
    const originalEnvironment = process.env.ENVIRONMENT_NAME;
    const originalBypass = process.env.CSRF_BYPASS_LOCAL_ONLY;

    process.env.ENVIRONMENT_NAME = "baby-local";
    process.env.CSRF_BYPASS_LOCAL_ONLY = "true";
    expect(isValidCsrfToken(null, undefined)).toBe(true);

    process.env.ENVIRONMENT_NAME = "baby-production";
    expect(isValidCsrfToken(null, undefined)).toBe(false);

    process.env.ENVIRONMENT_NAME = originalEnvironment;
    process.env.CSRF_BYPASS_LOCAL_ONLY = originalBypass;
  });
});
