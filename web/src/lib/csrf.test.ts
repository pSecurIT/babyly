import { describe, expect, it, vi, beforeEach } from "vitest";

const mockHeaders = new Map<string, string>();
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: () => mockCookies,
  headers: () => ({
    get: (name: string) => mockHeaders.get(name) ?? null,
  }),
}));

import { getCsrfToken, isValidCsrfToken, validateCsrfToken, csrfTokenFromForm } from "@/lib/csrf";

describe("csrf.ts - CSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.clear();
  });

  describe("getCsrfToken", () => {
    it("returns token from header when present", async () => {
      mockHeaders.set("x-baby-csrf-token", "a".repeat(64));
      const token = await getCsrfToken();
      expect(token).toBe("a".repeat(64));
    });

    it("returns token from cookie when header missing", async () => {
      mockHeaders.clear();
      mockCookies.get.mockReturnValue({ value: "b".repeat(64) });
      const token = await getCsrfToken();
      expect(token).toBe("b".repeat(64));
    });

    it("generates new token when neither header nor cookie present", async () => {
      mockHeaders.clear();
      mockCookies.get.mockReturnValue(undefined);
      const token = await getCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/i);
    });
  });

  describe("isValidCsrfToken", () => {
    it("returns true for matching valid tokens", () => {
      const token = "a".repeat(64);
      expect(isValidCsrfToken(token, token)).toBe(true);
    });

    it("returns false for mismatched tokens", () => {
      expect(isValidCsrfToken("a".repeat(64), "b".repeat(64))).toBe(false);
    });

    it("returns false for missing form token", () => {
      expect(isValidCsrfToken(null, "a".repeat(64))).toBe(false);
    });

    it("returns false for missing cookie token", () => {
      expect(isValidCsrfToken("a".repeat(64), undefined)).toBe(false);
    });

    it("returns false for invalid hex format", () => {
      expect(isValidCsrfToken("not-hex", "a".repeat(64))).toBe(false);
      expect(isValidCsrfToken("a".repeat(64), "not-hex")).toBe(false);
    });

    it("returns false for wrong length", () => {
      expect(isValidCsrfToken("a".repeat(32), "a".repeat(64))).toBe(false);
    });
  });

  describe("validateCsrfToken", () => {
    it("returns true when form and cookie tokens match", async () => {
      mockCookies.get.mockReturnValue({ value: "a".repeat(64) });
      const formData = new FormData();
      formData.append("csrfToken", "a".repeat(64));
      const token = formData.get("csrfToken") as string | null;
      const result = await validateCsrfToken(token);
      expect(result).toBe(true);
    });

    it("returns false when tokens mismatch", async () => {
      mockCookies.get.mockReturnValue({ value: "a".repeat(64) });
      const formData = new FormData();
      formData.append("csrfToken", "b".repeat(64));
      const token = formData.get("csrfToken") as string | null;
      const result = await validateCsrfToken(token);
      expect(result).toBe(false);
    });

    it("returns false when cookie missing", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const formData = new FormData();
      formData.append("csrfToken", "a".repeat(64));
      const token = formData.get("csrfToken") as string | null;
      const result = await validateCsrfToken(token);
      expect(result).toBe(false);
    });
  });

  describe("csrfTokenFromForm", () => {
    it("extracts token from FormData", () => {
      const formData = new FormData();
      formData.append("csrfToken", "test-token");
      expect(csrfTokenFromForm(formData)).toBe("test-token");
    });

    it("returns null when token missing", () => {
      const formData = new FormData();
      expect(csrfTokenFromForm(formData)).toBeNull();
    });

    it("returns null when token is not a string (e.g., File/Blob)", () => {
      const formData = new FormData();
      formData.append("csrfToken", new Blob(["test"]));
      expect(csrfTokenFromForm(formData)).toBeNull();
    });
  });
});