import { describe, expect, it, vi } from "vitest";

const { mockReadAdminSession, mockPrisma } = vi.hoisted(() => ({
  mockReadAdminSession: vi.fn(),
  mockPrisma: {
    participant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({
  readAdminSession: mockReadAdminSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/admin/export/route";

describe("admin CSV-export", () => {
  it("weigert export zonder adminsessie en leest geen data", async () => {
    mockReadAdminSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockPrisma.participant.findMany).not.toHaveBeenCalled();
  });

  it("exporteert data alleen na admin-authenticatie", async () => {
    mockReadAdminSession.mockResolvedValue({
      sub: "admin@example.com",
      scope: "admin",
      exp: 9999999999,
    });
    mockPrisma.participant.findMany.mockResolvedValue([
      {
        name: "Jan, Jansen",
        email: "jan@example.com",
        emailVerifiedAt: null,
        prediction: null,
        addressCard: null,
        createdAt: new Date("2026-08-26T12:00:00Z"),
      },
    ]);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await GET();
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(csv).toContain('"Jan, Jansen"');
    expect(csv).toContain("jan@example.com");
    expect(infoSpy).toHaveBeenCalledWith("[admin-audit] csv_exported");
    expect(infoSpy.mock.calls.flat().join(" ")).not.toContain("admin@example.com");
    expect(mockPrisma.participant.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        name: true,
        email: true,
        prediction: expect.any(Object),
        addressCard: expect.any(Object),
      }),
    }));
  });

  it("maakt CSV-formules onschadelijk voor spreadsheetprogramma's", async () => {
    mockReadAdminSession.mockResolvedValue({
      sub: "admin@example.com",
      scope: "admin",
      exp: 9999999999,
    });
    mockPrisma.participant.findMany.mockResolvedValue([
      {
        name: "=SUM(1,1)",
        email: "jan@example.com",
        emailVerifiedAt: null,
        prediction: null,
        addressCard: null,
      },
    ]);

    const response = await GET();
    const csv = await response.text();

    expect(csv).toContain('"\'=SUM(1,1)"');
  });
});