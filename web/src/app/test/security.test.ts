import { beforeEach, describe, expect, it } from "vitest";

import { adminEmailSet, getEnv } from "@/lib/env";

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

  it("houdt alleen allowlisted admin e-mails toe", () => {
    const allows = adminEmailSet();

    expect(allows.has("parent@example.com")).toBe(true);
    expect(allows.has("helper@example.com")).toBe(true);
    expect(allows.has("stranger@example.com")).toBe(false);
  });

  it("staat magic-link TTL tot 24 uur toe", () => {
    expect(getEnv().MAGIC_LINK_TTL_MINUTES).toBe(1440);
  });
});