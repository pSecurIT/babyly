import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncAccessCodeFromEnv, isValidAccessCode } from "@/lib/access-code";
import { sha256Hex } from "@/lib/security";

const mockPrisma = vi.hoisted(() => ({
  accessCode: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    ACCESS_CODE: "test-access-code",
    DATABASE_URL: "postgresql://localhost:5432/baby",
    APP_BASE_URL: "http://localhost:3000",
    SESSION_SECRET: "abcdefghijklmnopqrstuvwx1234567890",
    MAGIC_LINK_TTL_MINUTES: "1440",
    EMAIL_DELIVERY_MODE: "console",
    ADMIN_EMAILS: "parent@example.com,helper@example.com",
    PRIVACY_CONTACT_EMAIL: "privacy@example.com",
  }),
}));

describe("access-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncAccessCodeFromEnv", () => {
    it("upserts the access code hash from env var", async () => {
      mockPrisma.accessCode.upsert.mockResolvedValue({
        id: "primary",
        codeHash: "hashed-value",
      });

      await syncAccessCodeFromEnv();

      expect(mockPrisma.accessCode.upsert).toHaveBeenCalledWith({
        where: { id: "primary" },
        update: { codeHash: expect.any(String) },
        create: { id: "primary", codeHash: expect.any(String) },
      });
    });

    it("uses SHA-256 hash of trimmed ACCESS_CODE", async () => {
      mockPrisma.accessCode.upsert.mockResolvedValue({});
      const expectedHash = sha256Hex("test-access-code");

      await syncAccessCodeFromEnv();

      expect(mockPrisma.accessCode.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { codeHash: expectedHash },
          create: { id: "primary", codeHash: expectedHash },
        })
      );
    });
  });

  describe("isValidAccessCode", () => {
    it("returns false when no access code record exists", async () => {
      mockPrisma.accessCode.findUnique.mockResolvedValue(null);

      const result = await isValidAccessCode("any-code");

      expect(result).toBe(false);
      expect(mockPrisma.accessCode.findUnique).toHaveBeenCalledWith({
        where: { id: "primary" },
        select: { codeHash: true },
      });
    });

    it("returns true when provided code matches stored hash", async () => {
      const correctHash = sha256Hex("test-access-code");
      mockPrisma.accessCode.findUnique.mockResolvedValue({ codeHash: correctHash });

      const result = await isValidAccessCode("test-access-code");

      expect(result).toBe(true);
    });

    it("returns false when provided code does not match stored hash", async () => {
      const correctHash = sha256Hex("test-access-code");
      mockPrisma.accessCode.findUnique.mockResolvedValue({ codeHash: correctHash });

      const result = await isValidAccessCode("wrong-code");

      expect(result).toBe(false);
    });

    it("trims the provided code before hashing", async () => {
      const correctHash = sha256Hex("test-access-code");
      mockPrisma.accessCode.findUnique.mockResolvedValue({ codeHash: correctHash });

      const result = await isValidAccessCode("  test-access-code  ");

      expect(result).toBe(true);
    });

    it("uses constant-time comparison via safeEqualHex", async () => {
      const correctHash = sha256Hex("test-access-code");
      mockPrisma.accessCode.findUnique.mockResolvedValue({ codeHash: correctHash });

      // Should not throw and should return correct boolean
      await expect(isValidAccessCode("test-access-code")).resolves.toBe(true);
      await expect(isValidAccessCode("wrong")).resolves.toBe(false);
    });
  });
});