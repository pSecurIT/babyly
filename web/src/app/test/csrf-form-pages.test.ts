import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockPrisma, mockReadAdminSession, mockReadGuestSession } = vi.hoisted(() => ({
  mockPrisma: {
    participant: { count: vi.fn(), findUnique: vi.fn() },
    prediction: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    addressCard: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  mockReadAdminSession: vi.fn(),
  mockReadGuestSession: vi.fn(),
}))

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn().mockResolvedValue("page-csrf-token"),
}));

vi.mock("@/lib/session", () => ({
  readAdminSession: mockReadAdminSession,
  readGuestSession: mockReadGuestSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/app/deelnemen/actions", () => ({
  submitAddressAction: vi.fn(),
  submitPredictionAction: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  deleteParticipantAction: vi.fn(),
  purgeAllAction: vi.fn(),
  resetPredictionAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import AdminAddressesPage from "@/app/admin/adressen/page";
import AdminLoginPage from "@/app/admin/login/page";
import AdminDashboardPage from "@/app/admin/page";
import Home from "@/app/page";
import AddressFormPage from "@/app/deelnemen/adres/formulier/page";
import PredictionFormPage from "@/app/deelnemen/voorspelling/formulier/page";

const guestSession = { sub: "participant-1", scope: "guest" as const, exp: 9999999999 };
const adminSession = { sub: "admin@example.com", scope: "admin" as const, exp: 9999999999 };

function csrfFormCount(html: string) {
  return (html.match(/name="csrfToken"/g) ?? []).length;
}

function findPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return findPageFiles(path);
    }
    return entry.name === "page.tsx" ? [path] : [];
  });
}

async function renderPages() {
  mockReadGuestSession.mockResolvedValue(null);
  const home = renderToStaticMarkup(await Home({ searchParams: Promise.resolve({}) }));

  mockReadAdminSession.mockResolvedValue(null);
  const adminLogin = renderToStaticMarkup(await AdminLoginPage({ searchParams: Promise.resolve({}) }));

  mockReadGuestSession.mockResolvedValue(guestSession);
    mockPrisma.participant.findUnique.mockResolvedValue({ name: "Emma" });
    mockPrisma.prediction.findUnique.mockResolvedValue({ 
      predictedName: "Emma",
      gender: "girl",
      weightGrams: 3500,
      heightCm: 52,
      predictedBirthAt: new Date("2026-09-15T21:10:00Z"),
    });
  const prediction = renderToStaticMarkup(await PredictionFormPage({ searchParams: Promise.resolve({}) }));
    mockPrisma.addressCard.findUnique.mockResolvedValue(null);
    const address = renderToStaticMarkup(await AddressFormPage({ searchParams: Promise.resolve({}) }));

  mockReadAdminSession.mockResolvedValue(adminSession);
  mockPrisma.participant.count.mockResolvedValue(0);
  mockPrisma.prediction.findMany.mockResolvedValue([{
    id: "prediction-1",
    participantId: "participant-1",
    gender: "girl",
    weightGrams: 3500,
    heightCm: 52,
    predictedBirthAt: new Date("2026-09-15T21:10:00Z"),
    participant: { name: "Emma", email: "emma@example.com" },
  }]);
  mockPrisma.prediction.count.mockResolvedValue(1);
  mockPrisma.prediction.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  mockPrisma.addressCard.findMany.mockResolvedValue([]);
  const admin = renderToStaticMarkup(await AdminDashboardPage({ searchParams: Promise.resolve({}) }));
  const adminAddresses = renderToStaticMarkup(await AdminAddressesPage());

  return { home, adminLogin, prediction, address, admin, adminAddresses };
}

describe("CSRF-dekking van paginaformulieren", () => {
  it("vindt automatisch nieuwe formulierpagina's en controleert hun token", () => {
    const appDirectory = join(__dirname, "..");
    const pageFiles = findPageFiles(appDirectory);
    const formPages = pageFiles.filter((file) => readFileSync(file, "utf8").includes("<form"));

    expect(formPages.length).toBeGreaterThan(0);

    for (const file of formPages) {
      const source = readFileSync(file, "utf8");
      const formCount = (source.match(/<form\b/g) ?? []).length;
      const tokenFieldCount = (source.match(/name="csrfToken"/g) ?? []).length;

      expect(source, relative(appDirectory, file)).toContain("getCsrfToken");
      expect(tokenFieldCount, `${relative(appDirectory, file)} token fields`).toBe(formCount);
    }
  });

  it("voegt aan elk muterend formulier een server-token toe", async () => {
    const pages = await renderPages();
    const expectedFormCounts = {
          home: 1,
          adminLogin: 1,
          prediction: 1,
          address: 1,
          admin: 3,
          adminAddresses: 0,
        };

    for (const [page, html] of Object.entries(pages)) {
      expect(csrfFormCount(html), `${page} CSRF-form count`).toBe(expectedFormCounts[page as keyof typeof expectedFormCounts]);
      expect(html.match(/value="page-csrf-token"/g)?.length).toBe(expectedFormCounts[page as keyof typeof expectedFormCounts]);
    }
  });
});
