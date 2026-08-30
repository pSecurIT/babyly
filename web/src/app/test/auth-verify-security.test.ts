import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateSessionValue, mockPrisma } = vi.hoisted(() => ({
  mockCreateSessionValue: vi.fn(),
  mockPrisma: {
    magicLinkToken: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    participant: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({
  createSessionValue: mockCreateSessionValue,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/auth/verify/route";

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("magic-link security", () => {
  it("weigert requests zonder complete verificatiegegevens", async () => {
    const response = await GET(request("/api/auth/verify?scope=guest"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth=failed");
    expect(mockPrisma.magicLinkToken.findFirst).not.toHaveBeenCalled();
  });

  it("weigert verlopen of gebruikte tokens zonder sessie aan te maken", async () => {
    mockPrisma.magicLinkToken.findFirst.mockResolvedValue(null);

    const response = await GET(
      request("/api/auth/verify?token=token-1&email=user@example.com&scope=guest"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth=failed");
    expect(mockPrisma.magicLinkToken.updateMany).not.toHaveBeenCalled();
    expect(mockCreateSessionValue).not.toHaveBeenCalled();
  });

  it("blokkeert replay wanneer de atomische consume-update niets wijzigt", async () => {
    mockPrisma.magicLinkToken.findFirst.mockResolvedValue({ id: "token-1" });
    mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });

    const response = await GET(
      request("/api/auth/verify?token=token-1&email=user@example.com&scope=guest"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth=failed");
    expect(mockPrisma.participant.upsert).not.toHaveBeenCalled();
    expect(mockCreateSessionValue).not.toHaveBeenCalled();
  });

  it("staat geen externe next-url toe na succesvolle verificatie", async () => {
    mockPrisma.magicLinkToken.findFirst.mockResolvedValue({ id: "token-1" });
    mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.participant.upsert.mockResolvedValue({ id: "participant-1" });
    mockCreateSessionValue.mockReturnValue("signed-session");

    const response = await GET(
      request(
        "/api/auth/verify?token=token-1&email=user@example.com&scope=guest&next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mockCreateSessionValue).toHaveBeenCalledWith("participant-1", "guest", 60 * 60 * 24);
  });

  it("vervangt een bestaande sessiecookie na verificatie", async () => {
    mockPrisma.magicLinkToken.findFirst.mockResolvedValue({ id: "token-1" });
    mockPrisma.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.participant.upsert.mockResolvedValue({ id: "participant-1" });
    mockCreateSessionValue.mockReturnValue("new-signed-session");

    const verifyRequest = request(
      "/api/auth/verify?token=token-1&email=user@example.com&scope=guest",
    );
    verifyRequest.cookies.set("baby_session", "old-session");

    const response = await GET(verifyRequest);

    expect(response.cookies.get("baby_session")?.value).toBe("new-signed-session");
    expect(response.cookies.get("baby_session")?.value).not.toBe("old-session");
  });
});