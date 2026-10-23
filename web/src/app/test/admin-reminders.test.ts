import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadAdminSession, mockPrisma, mockSend, mockValidateCsrf } = vi.hoisted(() => ({
  mockReadAdminSession: vi.fn(),
  mockSend: vi.fn(),
  mockValidateCsrf: vi.fn(),
  mockPrisma: {
    participant: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    magicLinkToken: { create: vi.fn() },
  },
}));

vi.mock("@/lib/csrf", () => ({
  csrfTokenFromForm: vi.fn(() => "t"),
  validateCsrfToken: mockValidateCsrf,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("@/lib/session", () => ({ readAdminSession: mockReadAdminSession }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ APP_BASE_URL: "https://baby.example.com" }),
  adminEmailSet: () => new Set<string>(),
}));
vi.mock("@/lib/email", () => ({ sendAddressReminder: mockSend, sendCsvEmail: vi.fn() }));

import { sendAddressReminderAction, sendAllAddressRemindersAction } from "@/app/admin/actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

const eligible = {
  id: "p1",
  name: "Anna",
  email: "anna@example.com",
  reminderSentAt: null,
  prediction: { id: "pr1" },
  addressCard: null,
};

describe("adres-herinneringen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadAdminSession.mockResolvedValue({ sub: "admin@example.com", scope: "admin" });
    mockValidateCsrf.mockResolvedValue(true);
    mockSend.mockResolvedValue(undefined);
  });

  it("stuurt door naar login zonder adminsessie", async () => {
    mockReadAdminSession.mockResolvedValue(null);
    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow("/admin/login");
    await expect(sendAllAddressRemindersAction(form({ confirm: "yes" }))).rejects.toThrow("/admin/login");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("weigert ongeldige CSRF-token", async () => {
    mockValidateCsrf.mockResolvedValue(false);
    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow("/admin/email?error=ongeldig");
    await expect(sendAllAddressRemindersAction(form({ confirm: "yes" }))).rejects.toThrow("/admin/email?error=ongeldig");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("verstuurt een herinnering met magic link naar het adresformulier", async () => {
    mockPrisma.participant.findUnique.mockResolvedValue(eligible);

    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow(
      "/admin/email?reminded=1&skipped=0",
    );

    expect(mockPrisma.magicLinkToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "anna@example.com", purpose: "guest_login", participantId: "p1" }),
    });
    const link = new URL(mockSend.mock.calls[0][0].link);
    expect(link.pathname).toBe("/api/auth/verify");
    expect(link.searchParams.get("next")).toBe("/deelnemen/adres/formulier");
    expect(link.searchParams.get("scope")).toBe("guest");
    expect(mockPrisma.participant.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { reminderSentAt: expect.any(Date) },
    });
  });

  it("slaat deelnemers met adres of recente herinnering over", async () => {
    mockPrisma.participant.findUnique.mockResolvedValueOnce({ ...eligible, addressCard: { id: "a" } });
    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow("skipped=1");

    mockPrisma.participant.findUnique.mockResolvedValueOnce({ ...eligible, reminderSentAt: new Date() });
    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow("skipped=1");

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("meldt een mailfout", async () => {
    mockPrisma.participant.findUnique.mockResolvedValue(eligible);
    mockSend.mockRejectedValue(new Error("fail"));
    await expect(sendAddressReminderAction(form({ participantId: "p1" }))).rejects.toThrow("/admin/email?error=mail");
    expect(mockPrisma.participant.update).not.toHaveBeenCalled();
  });

  it("bulk vereist bevestiging", async () => {
    await expect(sendAllAddressRemindersAction(form({}))).rejects.toThrow("/admin/email?error=bevestiging");
    expect(mockPrisma.participant.findMany).not.toHaveBeenCalled();
  });

  it("bulk telt verzonden, overgeslagen en mislukte herinneringen", async () => {
    mockPrisma.participant.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    mockPrisma.participant.findUnique
      .mockResolvedValueOnce(eligible)
      .mockResolvedValueOnce({ ...eligible, id: "p2", addressCard: { id: "a" } })
      .mockResolvedValueOnce({ ...eligible, id: "p3" });
    mockSend.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("fail"));

    await expect(sendAllAddressRemindersAction(form({ confirm: "yes" }))).rejects.toThrow(
      "/admin/email?reminded=1&skipped=1&failed=1",
    );
  });
});
