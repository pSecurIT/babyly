import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadGuestSession, mockPrisma } = vi.hoisted(() => {
  const mockReadGuestSession = vi.fn();
  const mockPrisma = {
    $transaction: vi.fn(),
    participant: {
      update: vi.fn(),
    },
    prediction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    addressCard: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  return { mockReadGuestSession, mockPrisma };
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

vi.mock("@/lib/session", () => ({
  readGuestSession: mockReadGuestSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { submitAddressAction, submitPredictionAction } from "@/app/deelnemen/actions";

describe("business rules en flowafhandeling", () => {
  beforeEach(() => {
    mockReadGuestSession.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.participant.update.mockReset();
    mockPrisma.prediction.findUnique.mockReset();
    mockPrisma.prediction.create.mockReset();
    mockPrisma.prediction.update.mockReset();
    mockPrisma.addressCard.findUnique.mockReset();
    mockPrisma.addressCard.create.mockReset();
  });

  it("maakt een eerste voorspelling aan en stuurt een cross-prompt mee", async () => {
    mockReadGuestSession.mockResolvedValue({ sub: "participant-123", scope: "guest", exp: 9999999999 });

    const tx = {
      participant: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      prediction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(undefined),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const formData = new FormData();
    formData.set("name", "Emma");
    formData.set("gender", "girl");
    formData.set("weightKg", "3.5");
    formData.set("heightCm", "52");
    formData.set("birthDate", "2026-09-15");
    formData.set("birthTime", "21:10");

    await expect(submitPredictionAction(formData)).rejects.toThrow(
      "/deelnemen/voorspelling/bedankt",
    );
    expect(tx.prediction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participantId: "participant-123",
          gender: "girl",
          weightGrams: 3500,
          heightCm: 52,
        }),
      }),
    );
  });

  it("laat een eerste wijziging toe en blokkeert de tweede wijziging", async () => {
    mockReadGuestSession.mockResolvedValue({ sub: "participant-123", scope: "guest", exp: 9999999999 });

    const tx = {
      participant: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      prediction: {
        findUnique: vi.fn().mockResolvedValue({ editCount: 0, lockedAt: null }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const formData = new FormData();
    formData.set("name", "Emma");
    formData.set("gender", "girl");
    formData.set("weightKg", "3.7");
    formData.set("heightCm", "54");
    formData.set("birthDate", "2026-09-16");
    formData.set("birthTime", "21:15");

    await expect(submitPredictionAction(formData)).rejects.toThrow(
      "/deelnemen/voorspelling/bedankt",
    );

    tx.prediction.findUnique.mockResolvedValueOnce({ editCount: 1, lockedAt: new Date() });
    await expect(submitPredictionAction(formData)).rejects.toThrow(
      "/deelnemen/voorspelling/formulier?error=definitief",
    );
  });

  it("verhoogt de adresregel maximaal één adres per participant", async () => {
    mockReadGuestSession.mockResolvedValue({ sub: "participant-123", scope: "guest", exp: 9999999999 });
    mockPrisma.addressCard.findUnique.mockResolvedValue({ id: "address-1" });

    const formData = new FormData();
    formData.set("recipientName", "Jan Jansen");
    formData.set("street", "Kerkstraat");
    formData.set("houseNumber", "12A");
    formData.set("postalCode", "1234 AB");
    formData.set("city", "Utrecht");
    formData.set("country", "Nederland");

    await expect(submitAddressAction(formData)).rejects.toThrow(
      "/deelnemen/adres/formulier?error=bestaat",
    );
    expect(mockPrisma.addressCard.create).not.toHaveBeenCalled();
  });
});
