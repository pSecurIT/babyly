import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockPrisma: {
    participant: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    magicLinkToken: { create: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ APP_BASE_URL: "https://baby.example.com" }) }));
vi.mock("@/lib/email", () => ({ sendAddressReminder: mockSend }));

import {
  REMINDER_COOLDOWN_MS,
  REMINDER_LINK_TTL_MS,
  findReminderTargets,
  isInCooldown,
  sendReminderTo,
} from "@/lib/reminders";

const eligible = {
  id: "p1",
  name: "Anna",
  email: "anna@example.com",
  reminderSentAt: null,
  prediction: { id: "pr1" },
  addressCard: null,
};

describe("isInCooldown", () => {
  it("is false zonder eerdere herinnering", () => {
    expect(isInCooldown(null)).toBe(false);
  });

  it("is true binnen 7 dagen en false daarna", () => {
    const now = Date.now();
    expect(isInCooldown(new Date(now - REMINDER_COOLDOWN_MS + 1000), now)).toBe(true);
    expect(isInCooldown(new Date(now - REMINDER_COOLDOWN_MS - 1000), now)).toBe(false);
  });
});

describe("findReminderTargets", () => {
  it("selecteert alleen deelnemers met voorspelling en zonder adres", async () => {
    mockPrisma.participant.findMany.mockResolvedValue([]);
    await findReminderTargets();
    expect(mockPrisma.participant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { prediction: { isNot: null }, addressCard: null } }),
    );
  });
});

describe("sendReminderTo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue(undefined);
  });

  it("slaat onbekende deelnemers en deelnemers zonder voorspelling over", async () => {
    mockPrisma.participant.findUnique.mockResolvedValueOnce(null);
    expect(await sendReminderTo("x")).toBe("skipped");

    mockPrisma.participant.findUnique.mockResolvedValueOnce({ ...eligible, prediction: null });
    expect(await sendReminderTo("p1")).toBe("skipped");

    expect(mockPrisma.magicLinkToken.create).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("maakt een token van 7 dagen en slaat alleen de hash op", async () => {
    mockPrisma.participant.findUnique.mockResolvedValue(eligible);
    const before = Date.now();

    expect(await sendReminderTo("p1")).toBe("sent");

    const data = mockPrisma.magicLinkToken.create.mock.calls[0][0].data;
    const link = new URL(mockSend.mock.calls[0][0].link);
    const rawToken = link.searchParams.get("token")!;
    expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.tokenHash).not.toBe(rawToken);
    expect(data.expiresAt.getTime() - before).toBeGreaterThanOrEqual(REMINDER_LINK_TTL_MS - 1000);
    expect(link.searchParams.get("email")).toBe("anna@example.com");
    expect(link.searchParams.get("name")).toBe("Anna");
  });

  it("laat reminderSentAt ongemoeid als versturen mislukt", async () => {
    mockPrisma.participant.findUnique.mockResolvedValue(eligible);
    mockSend.mockRejectedValue(new Error("fail"));

    await expect(sendReminderTo("p1")).rejects.toThrow("fail");
    expect(mockPrisma.participant.update).not.toHaveBeenCalled();
  });
});
