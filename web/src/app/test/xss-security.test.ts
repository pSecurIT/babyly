import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mockReadGuestSession = vi.hoisted(() => vi.fn());
const mockParticipantFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({
  readGuestSession: mockReadGuestSession,
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn().mockResolvedValue("test-csrf-token"),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    participant: { findUnique: mockParticipantFindUnique },
  },
}));

vi.mock("@/app/deelnemen/actions", () => ({
  submitPredictionAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import PredictionFormPage from "@/app/deelnemen/voorspelling/formulier/page";

describe("XSS-beveiliging", () => {
  it("escaped gebruikersinvoer voordat die in HTML wordt gerenderd", async () => {
    mockReadGuestSession.mockResolvedValue({ sub: "participant-1", scope: "guest", exp: 9999999999 });
    mockParticipantFindUnique.mockResolvedValue({ name: '<img src=x onerror="alert(1)">' });

    const html = renderToStaticMarkup(await PredictionFormPage());

    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});