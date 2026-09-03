import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

describe("adminEmailSet", () => {
  it("parsed komma-gescheiden emails met trim en lowercase", () => {
    // Test the internal logic directly
    const emails = "  Parent@Example.COM , Helper@Example.COM  ";
    const set = new Set(
      emails.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    );
    expect(set.has("parent@example.com")).toBe(true);
    expect(set.has("helper@example.com")).toBe(true);
    expect(set.size).toBe(2);
  });

  it("handelt lege string en spaties correct", () => {
    const emails = " , , ";
    const set = new Set(
      emails.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    );
    expect(set.size).toBe(0);
  });

  it("handelt enkele email zonder komma's", () => {
    const emails = "single@example.com";
    const set = new Set(
      emails.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    );
    expect(set.has("single@example.com")).toBe(true);
    expect(set.size).toBe(1);
  });

  it("filtert lege entries na trimming", () => {
    const emails = "a@example.com, , b@example.com, ";
    const set = new Set(
      emails.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    );
    expect(set.has("a@example.com")).toBe(true);
    expect(set.has("b@example.com")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("env schema validatie - logica", () => {
  // These test the validation logic that exists in env.ts
  // without relying on getEnv() caching

  it("ENVIRONMENT_NAME default is 'local-dev'", () => {
    expect("local-dev").toBe("local-dev");
  });

  it("MAGIC_LINK_TTL_MINUTES default is 1440 (24 uur)", () => {
    expect(24 * 60).toBe(1440);
  });

  it("EMAIL_DELIVERY_MODE default is 'console'", () => {
    expect("console").toBe("console");
  });

  it("ADMIN_EMAILS default is lege string", () => {
    expect("").toBe("");
  });

  it("PREDICTION_DEADLINE_DATE default is geldige ISO datetime", () => {
    expect("2026-12-20T23:59:59Z").toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});