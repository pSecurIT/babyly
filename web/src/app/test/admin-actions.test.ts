import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadAdminSession, mockPrisma } = vi.hoisted(() => {
  const mockReadAdminSession = vi.fn();
  const mockPrisma = {
    $transaction: vi.fn(),
    participant: {
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    prediction: {
      deleteMany: vi.fn(),
    },
    magicLinkToken: {
      deleteMany: vi.fn(),
    },
  };

  return { mockReadAdminSession, mockPrisma };
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

vi.mock("@/lib/session", () => ({
  readAdminSession: mockReadAdminSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { deleteParticipantAction, purgeAllAction, resetPredictionAction } from "@/app/admin/actions";

describe("admin acties", () => {
  beforeEach(() => {
    mockReadAdminSession.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.participant.delete.mockReset();
    mockPrisma.participant.deleteMany.mockReset();
    mockPrisma.prediction.deleteMany.mockReset();
    mockPrisma.magicLinkToken.deleteMany.mockReset();
  });

  it("weigert acties zonder adminsessie", async () => {
    mockReadAdminSession.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("participantId", "participant-1");

    await expect(deleteParticipantAction(formData)).rejects.toThrow("/admin/login");
    expect(mockPrisma.participant.delete).not.toHaveBeenCalled();
  });

  it("verwijdert een deelnemer inclusief gekoppelde data", async () => {
    mockReadAdminSession.mockResolvedValue({ sub: "admin@example.com", scope: "admin", exp: 9999999999 });
    mockPrisma.participant.delete.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set("participantId", "participant-1");

    await expect(deleteParticipantAction(formData)).rejects.toThrow("/admin?deleted=1");
    expect(mockPrisma.participant.delete).toHaveBeenCalledWith({ where: { id: "participant-1" } });
  });

  it("reset een voorspelling zodat opnieuw indienen mogelijk is", async () => {
    mockReadAdminSession.mockResolvedValue({ sub: "admin@example.com", scope: "admin", exp: 9999999999 });
    mockPrisma.prediction.deleteMany.mockResolvedValue({ count: 1 });

    const formData = new FormData();
    formData.set("participantId", "participant-1");

    await expect(resetPredictionAction(formData)).rejects.toThrow("/admin?reset=1");
    expect(mockPrisma.prediction.deleteMany).toHaveBeenCalledWith({ where: { participantId: "participant-1" } });
  });

  it("purget alle deelnemergegevens in een transactie", async () => {
    mockReadAdminSession.mockResolvedValue({ sub: "admin@example.com", scope: "admin", exp: 9999999999 });
    mockPrisma.$transaction.mockResolvedValue(undefined);

    await expect(purgeAllAction()).rejects.toThrow("/admin?purged=1");
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
