import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  participant: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  magicLinkToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  accessCode: {
    findUnique: vi.fn(),
  },
}));

const mockIsValidAccessCode = vi.hoisted(() => vi.fn());
const mockSyncAccessCodeFromEnv = vi.hoisted(() => vi.fn());
const mockSendMagicLink = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn(() => ({ allowed: true, retryAfterSeconds: 600 })));
const mockGenerateRandomToken = vi.hoisted(() => vi.fn(() => "a".repeat(64)));
const mockSha256Hex = vi.hoisted(() => vi.fn(() => "b".repeat(64)));
const mockHmacSha256Hex = vi.hoisted(() => vi.fn(() => "c".repeat(64)));
const mockIsValidCsrfToken = vi.hoisted(() => vi.fn(() => true));
const mockGetEnv = vi.hoisted(() => vi.fn(() => ({
  APP_BASE_URL: "http://localhost:3000",
  MAGIC_LINK_TTL_MINUTES: 1440,
})));
const mockAdminEmailSet = vi.hoisted(() => vi.fn(() => new Set(["admin1@example.com", "admin2@example.com"])));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/access-code", () => ({
  isValidAccessCode: mockIsValidAccessCode,
  syncAccessCodeFromEnv: mockSyncAccessCodeFromEnv,
}));

vi.mock("@/lib/email", () => ({
  sendMagicLink: mockSendMagicLink,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/security", () => ({
  generateRandomToken: mockGenerateRandomToken,
  sha256Hex: mockSha256Hex,
  hmacSha256Hex: mockHmacSha256Hex,
}));

vi.mock("@/lib/csrf", () => ({
  isValidCsrfToken: mockIsValidCsrfToken,
}));

vi.mock("@/lib/env", () => ({
  getEnv: mockGetEnv,
  adminEmailSet: mockAdminEmailSet,
}));

import { POST as requestLinkPost } from "@/app/api/auth/request-link/route";
import { POST as adminRequestLinkPost } from "@/app/api/auth/admin-request-link/route";
import { GET as verifyGet } from "@/app/api/auth/verify/route";

describe("Auth API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 600 });
    mockGenerateRandomToken.mockReturnValue("a".repeat(64));
    mockSha256Hex.mockReturnValue("b".repeat(64));
    mockIsValidCsrfToken.mockReturnValue(true);
    mockGetEnv.mockReturnValue({
      APP_BASE_URL: "http://localhost:3000",
      MAGIC_LINK_TTL_MINUTES: 1440,
    });
    mockAdminEmailSet.mockReturnValue(new Set(["admin1@example.com", "admin2@example.com"]));
  });

  describe("POST /api/auth/request-link", () => {
    it("returns redirect on valid request", async () => {
      mockIsValidAccessCode.mockResolvedValue(true);

      const formData = new FormData();
      formData.append("accessCode", "correct-code");
      formData.append("name", "Emma");
      formData.append("email", "emma@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/request-link", {
        method: "POST",
        body: formData,
        headers: {
          "x-forwarded-for": "192.168.1.1",
          cookie: "baby_csrf=" + "a".repeat(64),
        },
      });

      const response = await requestLinkPost(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/?mail=1");
    });

    it("returns redirect on invalid CSRF", async () => {
      mockIsValidCsrfToken.mockReturnValue(false);

      const formData = new FormData();
      formData.append("accessCode", "code");
      formData.append("name", "Emma");
      formData.append("email", "emma@example.com");
      formData.append("csrfToken", "invalid");

      const request = new NextRequest("http://localhost:3000/api/auth/request-link", {
        method: "POST",
        body: formData,
      });

      const response = await requestLinkPost(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/?mail=1");
    });

    it("returns redirect on invalid input", async () => {
      const formData = new FormData();
      formData.append("accessCode", "");
      formData.append("name", "");
      formData.append("email", "invalid-email");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await requestLinkPost(request);
      expect(response.status).toBe(307);
    });

    it("returns redirect on rate limit exceeded", async () => {
      mockRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 600 });

      const formData = new FormData();
      formData.append("accessCode", "code");
      formData.append("name", "Emma");
      formData.append("email", "emma@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await requestLinkPost(request);
      expect(response.status).toBe(307);
    });

    it("returns redirect on invalid access code", async () => {
      mockIsValidAccessCode.mockResolvedValue(false);

      const formData = new FormData();
      formData.append("accessCode", "wrong-code");
      formData.append("name", "Emma");
      formData.append("email", "emma@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await requestLinkPost(request);
      expect(response.status).toBe(307);
    });
  });

  describe("POST /api/auth/admin-request-link", () => {
    it("returns redirect on valid admin email", async () => {
      const formData = new FormData();
      formData.append("email", "admin1@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/admin-request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await adminRequestLinkPost(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/admin/login?mail=1");
    });

    it("returns redirect on non-allowlisted email (generic response)", async () => {
      const formData = new FormData();
      formData.append("email", "not-admin@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/admin-request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await adminRequestLinkPost(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/admin/login?mail=1");
    });

    it("returns redirect on rate limit", async () => {
      mockRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 600 });

      const formData = new FormData();
      formData.append("email", "admin1@example.com");
      formData.append("csrfToken", "a".repeat(64));

      const request = new NextRequest("http://localhost:3000/api/auth/admin-request-link", {
        method: "POST",
        body: formData,
        headers: { cookie: "baby_csrf=" + "a".repeat(64) },
      });

      const response = await adminRequestLinkPost(request);
      expect(response.status).toBe(307);
    });

    it("returns redirect on invalid CSRF", async () => {
      mockIsValidCsrfToken.mockReturnValue(false);

      const formData = new FormData();
      formData.append("email", "admin1@example.com");
      formData.append("csrfToken", "invalid");

      const request = new NextRequest("http://localhost:3000/api/auth/admin-request-link", {
        method: "POST",
        body: formData,
      });

      const response = await adminRequestLinkPost(request);
      expect(response.status).toBe(307);
    });
  });

  describe("GET /api/auth/verify", () => {
    it("redirects to failure on missing params", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/verify");
      const response = await verifyGet(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/?auth=failed");
    });

    it("redirects to failure on invalid token", async () => {
      mockPrisma.magicLinkToken.findFirst.mockResolvedValue(null);

      const url = new URL("http://localhost:3000/api/auth/verify");
      url.searchParams.set("token", "invalid-token");
      url.searchParams.set("email", "test@example.com");
      url.searchParams.set("scope", "guest");

      const request = new NextRequest(url);
      const response = await verifyGet(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/?auth=failed");
    });

    it("redirects to failure on already used token", async () => {
          mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });

          const url = new URL("http://localhost:3000/api/auth/verify");
          url.searchParams.set("token", "valid-token");
          url.searchParams.set("email", "test@example.com");
          url.searchParams.set("scope", "guest");

          const request = new NextRequest(url);
          const response = await verifyGet(request);
          expect(response.status).toBe(307);
          expect(response.headers.get("location")).toContain("/?auth=failed");
        });

          it("creates admin session on valid admin token", async () => {
            mockPrisma.magicLinkToken.findFirst.mockResolvedValue({
              id: "token-1",
              email: "admin1@example.com",
              purpose: "admin_login",
              usedAt: null,
              expiresAt: new Date(Date.now() + 3600000),
            });
            mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });

            const url = new URL("http://localhost:3000/api/auth/verify");
            url.searchParams.set("token", "valid-token");
            url.searchParams.set("email", "admin1@example.com");
            url.searchParams.set("scope", "admin");
            url.searchParams.set("next", "/admin");

            const request = new NextRequest(url);
            const response = await verifyGet(request);
            expect(response.status).toBe(307);
            expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
            expect(response.cookies.get("baby_session")).toBeDefined();
          });

          it("sanitizes next parameter to prevent open redirect", async () => {
            mockPrisma.magicLinkToken.findFirst.mockResolvedValue({
              id: "token-1",
              email: "test@example.com",
              purpose: "guest_login",
              usedAt: null,
              expiresAt: new Date(Date.now() + 3600000),
            });
            mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.participant.upsert.mockResolvedValue({
              id: "participant-1",
              email: "test@example.com",
              name: "Emma",
              emailVerifiedAt: new Date(),
            });

            const url = new URL("http://localhost:3000/api/auth/verify");
            url.searchParams.set("token", "valid-token");
            url.searchParams.set("email", "test@example.com");
            url.searchParams.set("scope", "guest");
            url.searchParams.set("next", "http://evil.com");

            const request = new NextRequest(url);
            const response = await verifyGet(request);
            expect(response.status).toBe(307);
            expect(response.headers.get("location")).toBe("http://localhost:3000/");
          });

    it("redirects to failure on non-allowlisted admin email", async () => {
      mockPrisma.magicLinkToken.findFirst.mockResolvedValue({
        id: "token-1",
        email: "not-admin@example.com",
        purpose: "admin_login",
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const url = new URL("http://localhost:3000/api/auth/verify");
      url.searchParams.set("token", "valid-token");
      url.searchParams.set("email", "not-admin@example.com");
      url.searchParams.set("scope", "admin");

      const request = new NextRequest(url);
      const response = await verifyGet(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/admin/login?auth=failed");
    });

    it("sanitizes next parameter to prevent open redirect", async () => {
      mockPrisma.magicLinkToken.findFirst.mockResolvedValue({
        id: "token-1",
        email: "test@example.com",
        purpose: "guest_login",
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.participant.upsert.mockResolvedValue({
        id: "participant-1",
        email: "test@example.com",
        name: "Emma",
        emailVerifiedAt: new Date(),
      });

      const url = new URL("http://localhost:3000/api/auth/verify");
      url.searchParams.set("token", "valid-token");
      url.searchParams.set("email", "test@example.com");
      url.searchParams.set("scope", "guest");
      url.searchParams.set("next", "http://evil.com");

      const request = new NextRequest(url);
      const response = await verifyGet(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");
    });
  });
});