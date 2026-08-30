import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockPrisma, mockReadAdminSession, mockReadGuestSession } = vi.hoisted(() => ({
  mockPrisma: {
    participant: { count: vi.fn(), findUnique: vi.fn() },
    prediction: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    addressCard: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  mockReadAdminSession: vi.fn(),
  mockReadGuestSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  readAdminSession: mockReadAdminSession,
  readGuestSession: mockReadGuestSession,
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn().mockResolvedValue("test-csrf-token"),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import AdminAddressesPage from "@/app/admin/adressen/page";
import AdminDashboardPage from "@/app/admin/page";
import AddressThanksPage from "@/app/deelnemen/adres/bedankt/page";
import PredictionThanksPage from "@/app/deelnemen/voorspelling/bedankt/page";

const guestSession = { sub: "participant-own", scope: "guest" as const, exp: 9999999999 };
const adminSession = { sub: "admin@example.com", scope: "admin" as const, exp: 9999999999 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IDOR- en ongeautoriseerde leesbeveiliging", () => {
  it("queryt de voorspelling uitsluitend voor de participant uit de sessie", async () => {
    mockReadGuestSession.mockResolvedValue(guestSession);
    mockPrisma.prediction.findUnique.mockResolvedValue({
      predictedName: "Johan",
      gender: "boy",
      weightGrams: 3500,
      heightCm: 50,
      predictedBirthAt: new Date("2026-09-15T10:30:00Z"),
    });

    const html = renderToStaticMarkup(await PredictionThanksPage());

    expect(html).toContain("Bedankt voor je voorspelling!");
    expect(mockPrisma.prediction.findUnique).toHaveBeenCalledWith({
      where: { participantId: "participant-own" },
    });
    expect(mockPrisma.prediction.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { participantId: "participant-other" } }),
    );
  });

  it("queryt het adres uitsluitend voor de participant uit de sessie", async () => {
    mockReadGuestSession.mockResolvedValue(guestSession);
    mockPrisma.addressCard.findUnique.mockResolvedValue({ id: "address-own" });

    const html = renderToStaticMarkup(await AddressThanksPage());

    expect(html).toContain("Bedankt voor je adres!");
    expect(mockPrisma.addressCard.findUnique).toHaveBeenCalledWith({
      where: { participantId: "participant-own" },
      select: { id: true },
    });
  });

  it("weigert ongesessieerde deelnemerleesroutes voordat data wordt gelezen", async () => {
    mockReadGuestSession.mockResolvedValue(null);

    await expect(PredictionThanksPage()).rejects.toThrow("redirect:/?auth=1");
    await expect(AddressThanksPage()).rejects.toThrow("redirect:/?auth=1");

    expect(mockPrisma.prediction.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.addressCard.findUnique).not.toHaveBeenCalled();
  });

  it("weigert een gastsessie op beide admin-leespagina's vóór database-toegang", async () => {
    mockReadAdminSession.mockResolvedValue(null);

    await expect(AdminDashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "redirect:/admin/login",
    );
    await expect(AdminAddressesPage()).rejects.toThrow("redirect:/admin/login");

    expect(mockPrisma.participant.count).not.toHaveBeenCalled();
    expect(mockPrisma.prediction.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.addressCard.findMany).not.toHaveBeenCalled();
  });

  it("laat admin-leespagina's alleen na een admin-sessie data lezen", async () => {
    mockReadAdminSession.mockResolvedValue(adminSession);
    mockPrisma.participant.count.mockResolvedValue(0);
    mockPrisma.prediction.findMany.mockResolvedValue([]);
    mockPrisma.prediction.count.mockResolvedValue(0);
    mockPrisma.addressCard.findMany.mockResolvedValue([]);

    await AdminDashboardPage({ searchParams: Promise.resolve({}) });
    await AdminAddressesPage();

    expect(mockPrisma.participant.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.prediction.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.addressCard.findMany).toHaveBeenCalledTimes(1);
  });
});
