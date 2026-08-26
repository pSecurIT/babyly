import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockIsValidCsrfToken, mockRateLimit } = vi.hoisted(() => ({
  mockIsValidCsrfToken: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  isValidCsrfToken: mockIsValidCsrfToken,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ MAGIC_LINK_TTL_MINUTES: 15, APP_BASE_URL: "http://localhost:3000" }),
}));

vi.mock("@/lib/access-code", () => ({
  isValidAccessCode: vi.fn(),
  syncAccessCodeFromEnv: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    participant: { upsert: vi.fn() },
    magicLinkToken: { create: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendMagicLink: vi.fn(),
}));

import { POST } from "@/app/api/auth/request-link/route";

describe("guest request-link logging", () => {
  it("logt geen IP of formuliergegevens bij rate limiting", async () => {
    mockIsValidCsrfToken.mockReturnValue(true);
    mockRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 60 });

    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(new NextRequest("http://localhost:3000/api/auth/request-link", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10" },
      body: new URLSearchParams({
        csrfToken: "a".repeat(64),
        accessCode: "secret-access-code",
        name: "Emma",
        email: "emma@example.com",
      }),
    }));

    expect(response.status).toBe(307);
    expect(warningSpy).toHaveBeenCalledWith("[request-link] rate_limited");
    expect(warningSpy.mock.calls.flat().join(" ")).not.toContain("203.0.113.10");
    expect(warningSpy.mock.calls.flat().join(" ")).not.toContain("emma@example.com");
    expect(warningSpy.mock.calls.flat().join(" ")).not.toContain("secret-access-code");
    warningSpy.mockRestore();
  });
});