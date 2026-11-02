import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadAdminSession, mockPrisma, mockSendCustom, mockValidateCsrf, mockReminder, mockGuestLink } = vi.hoisted(() => ({
  mockReadAdminSession: vi.fn(),
  mockSendCustom: vi.fn(),
  mockValidateCsrf: vi.fn(),
  mockReminder: vi.fn(),
  mockGuestLink: vi.fn(),
  mockPrisma: {
    emailTemplate: { upsert: vi.fn(), deleteMany: vi.fn() },
    customEmail: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    customEmailSend: { create: vi.fn() },
    customEmailRecipient: { create: vi.fn() },
    participant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/csrf", () => ({ csrfTokenFromForm: vi.fn(() => "t"), validateCsrfToken: mockValidateCsrf }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("@/lib/session", () => ({ readAdminSession: mockReadAdminSession }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/email", () => ({ sendCustomEmail: mockSendCustom, sendTemplatePreview: vi.fn() }));
vi.mock("@/lib/reminders", () => ({ sendReminderTo: mockReminder, sendGuestLinkTo: mockGuestLink }));

import {
  deleteCustomEmailAction,
  saveCustomEmailAction,
  saveTemplateAction,
  sendEmailAction,
} from "@/app/admin/email/actions";

const empty = { errors: [], message: null };

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

describe("admin e-mailacties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadAdminSession.mockResolvedValue({ sub: "admin@example.com", scope: "admin" });
    mockValidateCsrf.mockResolvedValue(true);
    mockSendCustom.mockResolvedValue(undefined);
  });

  it("vereist een adminsessie en CSRF-token", async () => {
    mockReadAdminSession.mockResolvedValue(null);
    await expect(saveTemplateAction(empty, form({ key: "test_email" }))).rejects.toThrow("/admin/login");
    mockReadAdminSession.mockResolvedValue({ sub: "a", scope: "admin" });
    mockValidateCsrf.mockResolvedValue(false);
    await expect(saveCustomEmailAction(empty, form({}))).rejects.toThrow("error=ongeldig");
    expect(mockPrisma.emailTemplate.upsert).not.toHaveBeenCalled();
  });

  it("wijst een sjabloon zonder verplichte {{link}} af", async () => {
    const result = await saveTemplateAction(
      empty,
      form({ key: "guest_magic_link", subject: "Hoi", html: "<p>zonder link</p>", intent: "save" }),
    );
    expect(result.errors[0]).toContain("{{link}}");
    expect(mockPrisma.emailTemplate.upsert).not.toHaveBeenCalled();
  });

  it("slaat een geldig sjabloon op met gesaneerde HTML", async () => {
    await expect(
      saveTemplateAction(
        empty,
        form({ key: "guest_magic_link", subject: "Hoi", html: '<a href="{{link}}">x</a><script>1</script>', intent: "save" }),
      ),
    ).rejects.toThrow("saved=1");
    const html = mockPrisma.emailTemplate.upsert.mock.calls[0][0].create.html as string;
    expect(html).toContain("{{link}}");
    expect(html).not.toContain("script");
  });

  it("verstuurt een eigen sjabloon alleen na bevestiging en logt de verzending", async () => {
    mockPrisma.customEmail.findUnique.mockResolvedValue({ id: "ce1", subject: "S", html: "<p>x</p>" });
    mockPrisma.customEmailSend.create.mockResolvedValue({ id: "s1" });
    mockPrisma.participant.findMany.mockResolvedValue([{ id: "p1aaaaaaaaaa", email: "a@x.nl", name: "Anna" }]);
    const base = { template: "ce1", participantId: ["p1aaaaaaaaaa"], extraEmails: "b@x.nl" };

    const noConfirm = await sendEmailAction(empty, form(base));
    expect(noConfirm.errors[0]).toContain("Bevestig");
    expect(mockSendCustom).not.toHaveBeenCalled();

    await expect(sendEmailAction(empty, form({ ...base, confirm: "yes" }))).rejects.toThrow("sent=2&skipped=0&failed=0");
    expect(mockSendCustom).toHaveBeenCalledTimes(2);
    expect(mockSendCustom).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "custom/s1/a@x.nl" }));
    expect(mockPrisma.customEmailRecipient.create).toHaveBeenCalledTimes(2);
  });

  it("verstuurt de adres-herinnering als systeemmail met overslaan en fouten", async () => {
    mockReminder.mockResolvedValueOnce("sent").mockResolvedValueOnce("skipped").mockRejectedValueOnce(new Error("x"));
    const fields = { template: "address_reminder", confirm: "yes", participantId: ["p1aaaaaaaaaa", "p2aaaaaaaaaa", "p3aaaaaaaaaa"] };

    await expect(sendEmailAction(empty, form(fields))).rejects.toThrow("sent=1&skipped=1&failed=1");
    expect(mockReminder).toHaveBeenCalledTimes(3);
    expect(mockPrisma.customEmailSend.create).not.toHaveBeenCalled();
  });

  it("weigert onbruikbare systeemmails en extra adressen bij systeemmails", async () => {
    const admin = await sendEmailAction(empty, form({ template: "admin_magic_link", confirm: "yes", participantId: "p1aaaaaaaaaa" }));
    expect(admin.errors[0]).toContain("niet naar deelnemers");

    const extra = await sendEmailAction(
      empty,
      form({ template: "guest_magic_link", confirm: "yes", participantId: "p1aaaaaaaaaa", extraEmails: "b@x.nl" }),
    );
    expect(extra.errors[0]).toContain("alleen mogelijk met eigen sjablonen");
    expect(mockGuestLink).not.toHaveBeenCalled();
  });

  it("slaat een bestaand sjabloon op als nieuw sjabloon zonder het origineel te wijzigen", async () => {
    mockPrisma.customEmail.findUnique.mockResolvedValue({ id: "ce1" });
    mockPrisma.customEmail.create.mockResolvedValue({ id: "ce2" });

    await expect(
      saveCustomEmailAction(empty, form({ id: "ce1", name: "Kopie", subject: "S", html: "<p>x</p>", intent: "save_copy" })),
    ).rejects.toThrow("/admin/email/bericht/ce2?saved=1");
    expect(mockPrisma.customEmail.update).not.toHaveBeenCalled();
  });

  it("verwijdert een sjabloon alleen met sessie en CSRF", async () => {
    mockValidateCsrf.mockResolvedValue(false);
    await expect(deleteCustomEmailAction(form({ id: "ce1" }))).rejects.toThrow("error=ongeldig");
    expect(mockPrisma.customEmail.deleteMany).not.toHaveBeenCalled();

    mockValidateCsrf.mockResolvedValue(true);
    await expect(deleteCustomEmailAction(form({ id: "ce1" }))).rejects.toThrow("deletedMail=1");
    expect(mockPrisma.customEmail.deleteMany).toHaveBeenCalledWith({ where: { id: "ce1" } });
  });
});
