import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("accepteert een TTL van 7 dagen en weigert meer dan 30 dagen", async () => {
    const load = async (ttl: string) => {
      vi.resetModules();
      process.env.MAGIC_LINK_TTL_MINUTES = ttl;
      return (await import("@/lib/env")).getEnv();
    };

    expect((await load("10080")).MAGIC_LINK_TTL_MINUTES).toBe(10080);
    await expect(load(String(30 * 24 * 60 + 1))).rejects.toThrow();
    await expect(load("4")).rejects.toThrow();
  });
});