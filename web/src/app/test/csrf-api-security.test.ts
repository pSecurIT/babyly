import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockIsValidCsrfToken, mockPrisma } = vi.hoisted(() => ({
  mockIsValidCsrfToken: vi.fn(),
  mockPrisma: {
    participant: { upsert: vi.fn() },
    magicLinkToken: { create: vi.fn() },
  },
}));

vi.mock("@/lib/csrf", () => ({
  isValidCsrfToken: mockIsValidCsrfToken,
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    APP_BASE_URL: "http://localhost:3000",
    MAGIC_LINK_TTL_MINUTES: 15,
  }),
  adminEmailSet: () => new Set(["admin@example.com"]),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { POST as requestGuestLink } from "@/app/api/auth/request-link/route";
import { POST as requestAdminLink } from "@/app/api/auth/admin-request-link/route";

function request(path: string, fields: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: new URLSearchParams(fields),
  });
}

describe("CSRF-bescherming van auth POST-routes", () => {
  it("weigert een gast-aanvraag zonder geldige token", async () => {
    mockIsValidCsrfToken.mockReturnValue(false);

    const response = await requestGuestLink(request("/api/auth/request-link", {
      accessCode: "correct-code",
      name: "Emma",
      email: "emma@example.com",
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?mail=1");
    expect(mockPrisma.participant.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.magicLinkToken.create).not.toHaveBeenCalled();
  });

  it("weigert een admin-aanvraag zonder geldige token", async () => {
    mockIsValidCsrfToken.mockReturnValue(false);

    const response = await requestAdminLink(request("/api/auth/admin-request-link", {
      email: "admin@example.com",
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login?mail=1");
    expect(mockPrisma.magicLinkToken.create).not.toHaveBeenCalled();
  });
});