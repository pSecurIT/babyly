import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadGuestSession, mockValidateCsrfToken, mockCsrfTokenFromForm, mockMarkCrossPromptSeen, mockPrisma } = vi.hoisted(() => ({
  mockReadGuestSession: vi.fn(),
  mockValidateCsrfToken: vi.fn(),
  mockCsrfTokenFromForm: vi.fn(),
  mockMarkCrossPromptSeen: vi.fn(),
  mockPrisma: {
    prediction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    addressCard: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  },
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrfToken: mockValidateCsrfToken,
  csrfTokenFromForm: mockCsrfTokenFromForm,
}));

vi.mock("@/lib/session", () => ({
  readGuestSession: mockReadGuestSession,
  markCrossPromptSeen: mockMarkCrossPromptSeen,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    PREDICTION_DEADLINE_DATE: "2099-12-31",
  }),
}));

import { submitPredictionAction, submitAddressAction } from "@/app/deelnemen/actions";

describe("deelnemer server actions", () => {
  const validGuestSession = { sub: "participant-1", scope: "guest" as const, exp: 9999999999 };
  const validPredictionForm = {
    name: "Emma",
    gender: "girl",
    weightKg: "3.5",
    heightCm: "52",
    birthDate: "2026-09-15",
    birthTime: "21:10",
  };
  const validAddressForm = {
    recipientName: "Jan Jansen",
    street: "Kerkstraat",
    houseNumber: "12A",
    postalCode: "1234 AB",
    city: "Utrecht",
    country: "Nederland",
  };

  function createFormData(data: Record<string, string>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.set(key, value));
    return formData;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadGuestSession.mockResolvedValue(validGuestSession);
    mockValidateCsrfToken.mockResolvedValue(true);
    mockCsrfTokenFromForm.mockReturnValue("valid-csrf-token");
    mockMarkCrossPromptSeen.mockResolvedValue(undefined);
    mockPrisma.prediction.findUnique.mockResolvedValue(null);
    mockPrisma.prediction.create.mockResolvedValue({ id: "prediction-1" });
    mockPrisma.prediction.update.mockResolvedValue({ id: "prediction-1" });
    mockPrisma.addressCard.findUnique.mockResolvedValue(null);
    mockPrisma.addressCard.create.mockResolvedValue({ id: "address-1" });
    mockPrisma.addressCard.update.mockResolvedValue({ id: "address-1" });
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== submitPredictionAction ====================

  it("weigert submit zonder gast-sessie", async () => {
    mockReadGuestSession.mockResolvedValue(null);
    await expect(submitPredictionAction(createFormData(validPredictionForm))).rejects.toThrow("/?auth=1");
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("weigert submit met ongeldige CSRF", async () => {
    mockValidateCsrfToken.mockResolvedValue(false);
    await expect(submitPredictionAction(createFormData(validPredictionForm))).rejects.toThrow("/deelnemen/voorspelling/formulier?error=ongeldig");
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("weigert submit met validatiefout", async () => {
    const invalidForm = { ...validPredictionForm, weightKg: "0.1" };
    await expect(submitPredictionAction(createFormData(invalidForm))).rejects.toThrow("/deelnemen/voorspelling/formulier?error=validatie");
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("weigert submit met ongeldige datum/tijd", async () => {
    const invalidForm = { ...validPredictionForm, birthDate: "2026-02-30" };
    await expect(submitPredictionAction(createFormData(invalidForm))).rejects.toThrow("/deelnemen/voorspelling/formulier?error=datumtijd");
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("maakt nieuwe prediction aan als er nog geen bestaat", async () => {
    await expect(submitPredictionAction(createFormData(validPredictionForm))).rejects.toThrow("/deelnemen/voorspelling/bedankt");
    expect(mockPrisma.prediction.findUnique).toHaveBeenCalledWith({ where: { participantId: "participant-1" } });
    expect(mockPrisma.prediction.create).toHaveBeenCalled();
    expect(mockPrisma.prediction.update).not.toHaveBeenCalled();
  });

  it("werkt bestaande prediction bij", async () => {
    mockPrisma.prediction.findUnique.mockResolvedValue({ id: "existing-prediction" });
    await expect(submitPredictionAction(createFormData(validPredictionForm))).rejects.toThrow("/deelnemen/voorspelling/bedankt");
    expect(mockPrisma.prediction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { participantId: "participant-1" },
    }));
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("voegt cross-prompt seen flag toe aan sessie na succesvolle submit", async () => {
    await expect(submitPredictionAction(createFormData(validPredictionForm))).rejects.toThrow("/deelnemen/voorspelling/bedankt");
    expect(mockMarkCrossPromptSeen).toHaveBeenCalledWith("predictionToAddress");
  });

  // ==================== submitAddressAction ====================

  it("weigert submit zonder gast-sessie", async () => {
    mockReadGuestSession.mockResolvedValue(null);
    await expect(submitAddressAction(createFormData(validAddressForm))).rejects.toThrow("/?auth=1");
    expect(mockPrisma.addressCard.create).not.toHaveBeenCalled();
  });

  it("weigert submit met ongeldige CSRF", async () => {
    mockValidateCsrfToken.mockResolvedValue(false);
    await expect(submitAddressAction(createFormData(validAddressForm))).rejects.toThrow("/deelnemen/adres/formulier?error=ongeldig");
    expect(mockPrisma.addressCard.create).not.toHaveBeenCalled();
  });

  it("weigert submit met validatiefout", async () => {
    const invalidForm = { ...validAddressForm, recipientName: "" };
    await expect(submitAddressAction(createFormData(invalidForm))).rejects.toThrow("/deelnemen/adres/formulier?error=validatie");
    expect(mockPrisma.addressCard.create).not.toHaveBeenCalled();
  });

  it("maakt nieuwe address card aan als er nog geen bestaat", async () => {
    await expect(submitAddressAction(createFormData(validAddressForm))).rejects.toThrow("/deelnemen/adres/bedankt");
    expect(mockPrisma.addressCard.findUnique).toHaveBeenCalledWith({ where: { participantId: "participant-1" }, select: { id: true } });
    expect(mockPrisma.addressCard.create).toHaveBeenCalled();
    expect(mockPrisma.addressCard.update).not.toHaveBeenCalled();
  });

  it("werkt bestaande address card bij (upsert)", async () => {
    mockPrisma.addressCard.findUnique.mockResolvedValue({ id: "existing-address" });
    await expect(submitAddressAction(createFormData(validAddressForm))).rejects.toThrow("/deelnemen/adres/bedankt");
    expect(mockPrisma.addressCard.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "existing-address" },
    }));
    expect(mockPrisma.addressCard.create).not.toHaveBeenCalled();
  });

  it("voegt cross-prompt seen flag toe aan sessie na succesvolle submit", async () => {
    await expect(submitAddressAction(createFormData(validAddressForm))).rejects.toThrow("/deelnemen/adres/bedankt");
    expect(mockMarkCrossPromptSeen).toHaveBeenCalledWith("addressToPrediction");
  });
});