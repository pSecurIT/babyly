import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockReadGuestSession, mockPrisma } = vi.hoisted(() => {
  const mockReadGuestSession = vi.fn();
  const mockPrisma = {
    $transaction: vi.fn(),
    participant: { findUnique: vi.fn(), update: vi.fn() },
    prediction: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    addressCard: { findUnique: vi.fn(), create: vi.fn() },
  };
  return { mockReadGuestSession, mockPrisma };
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("@/lib/session", () => ({
  readGuestSession: mockReadGuestSession,
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn().mockResolvedValue("valid-csrf-token"),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import Home from "@/app/page";
import PredictionFormPage from "@/app/deelnemen/voorspelling/formulier/page";
import AddressFormPage from "@/app/deelnemen/adres/formulier/page";

const activeSession = { sub: "participant-123", scope: "guest" as const, exp: 9999999999 };

describe("hergebruik van een bestaande sessie tussen beide flows", () => {
  beforeEach(() => {
    mockReadGuestSession.mockReset();
    mockReadGuestSession.mockResolvedValue(activeSession);
    mockPrisma.participant.findUnique.mockReset();
    mockPrisma.participant.findUnique.mockResolvedValue(null);
  });

  it("laat een geverifieerde gebruiker de voorspelflow openen zonder nieuwe magic link", async () => {
    mockPrisma.prediction.findUnique.mockResolvedValue({
      predictedName: "Noor",
      gender: "girl",
      weightGrams: 3500,
      heightCm: 52,
      predictedBirthAt: new Date("2026-09-15T21:10:00"),
    });

    const element = await PredictionFormPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Wat denk jij?");
    expect(html).toContain('value="Noor"');
    expect(html).toContain('value="girl" selected=""');
    expect(html).toContain('value="3.5"');
    expect(html).toContain('value="52"');
    expect(html).toContain('value="2026-09-15"');
    expect(html).toContain('value="21:10"');
    expect(html).not.toContain("accessCode");
  });

  it("laat dezelfde sessie ook de adresflow openen zonder nieuwe magic link", async () => {
    const element = await AddressFormPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Adres voor geboortekaartje");
    expect(html).not.toContain("accessCode");
  });

  it("toont op de landingspagina de keuze tussen beide flows i.p.v. de toegangscode-poort", async () => {
    const element = await Home({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("/deelnemen/voorspelling/formulier");
    expect(html).toContain("/deelnemen/adres/formulier");
    expect(html).not.toContain("accessCode");
  });

  it("gebruikt dezelfde sessie-lookup voor beide flows zonder extra token-uitgifte", async () => {
    await PredictionFormPage({ searchParams: Promise.resolve({}) });
    await AddressFormPage();

    expect(mockReadGuestSession).toHaveBeenCalledTimes(2);
    mockReadGuestSession.mock.results.forEach((result) => {
      expect(result.value).resolves.toEqual(activeSession);
    });
  });

  it("stuurt alleen door naar de toegangspoort wanneer er geen sessie is", async () => {
    mockReadGuestSession.mockResolvedValue(null);

    await expect(PredictionFormPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/?auth=1");
    await expect(AddressFormPage()).rejects.toThrow("redirect:/?auth=1");
  });
});
