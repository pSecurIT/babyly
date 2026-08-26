import { describe, expect, it } from "vitest";

import {
  accessRequestSchema,
  addressInputSchema,
  predictionInputSchema,
  toPredictedBirthAt,
} from "@/lib/validation";

describe("validatie van invoerdelen", () => {
  it("accepteert een geldige voorspelling en normaliseert invoer", () => {
    const parsed = predictionInputSchema.parse({
      name: "  Emma  ",
      gender: "girl",
      weightKg: "3.5",
      heightCm: "52",
      birthDate: "2026-09-15",
      birthTime: "21:10",
    });

    expect(parsed.name).toBe("Emma");
    expect(parsed.gender).toBe("girl");
    expect(parsed.weightKg).toBe(3.5);
    expect(parsed.heightCm).toBe(52);
  });

  it("verwerpt ongeldige voorspellingwaarden", () => {
    expect(() =>
      predictionInputSchema.parse({
        name: "",
        gender: "boy",
        weightKg: "0.1",
        heightCm: "19",
        birthDate: "2026-02-30",
        birthTime: "25:99",
      }),
    ).toThrow();

    expect(() =>
      predictionInputSchema.parse({
        name: "Anna",
        gender: "unknown",
        weightKg: "3",
        heightCm: "50",
        birthDate: "2026-03-01",
        birthTime: "08:30",
      }),
    ).toThrow();
  });

  it("accepteert een geldig adresformulier met trimming", () => {
    const parsed = addressInputSchema.parse({
      recipientName: "  Jan Jansen  ",
      street: " Kerkstraat ",
      houseNumber: "12A",
      postalCode: " 1234 AB ",
      city: " Utrecht ",
      country: "Nederland",
    });

    expect(parsed.recipientName).toBe("Jan Jansen");
    expect(parsed.street).toBe("Kerkstraat");
    expect(parsed.postalCode).toBe("1234 AB");
  });

  it("verwerpt een leeg of onvolledig adres", () => {
    expect(() =>
      addressInputSchema.parse({
        recipientName: "",
        street: "",
        houseNumber: "12A",
        postalCode: "1234 AB",
        city: "Utrecht",
        country: "Nederland",
      }),
    ).toThrow();
  });

  it("valideert access-code flow input, normaliseert naam en lowercases email", () => {
    const parsed = accessRequestSchema.parse({
      accessCode: "  secret-code ",
      name: "  Emma  ",
      email: "  User@Example.com  ",
    });

    expect(parsed.name).toBe("Emma");
    expect(parsed.email).toBe("user@example.com");
  });

  it("verwijdert onbekende velden uit het gevalideerde formulierresultaat", () => {
    const parsed = predictionInputSchema.parse({
      name: "Emma",
      gender: "girl",
      weightKg: "3.5",
      heightCm: "52",
      birthDate: "2026-09-15",
      birthTime: "21:10",
      isAdmin: true,
      participantId: "other-participant",
    });

    expect(parsed).not.toHaveProperty("isAdmin");
    expect(parsed).not.toHaveProperty("participantId");
  });

  it("bouwt een geldige datetime en weigert ongeldige combinaties", () => {
    const valid = toPredictedBirthAt("2026-09-15", "21:10");
    expect(valid).not.toBeNull();
    expect(valid?.getFullYear()).toBe(2026);
    expect(valid?.getMonth()).toBe(8);
    expect(valid?.getDate()).toBe(15);
    expect(valid?.getHours()).toBe(21);
    expect(valid?.getMinutes()).toBe(10);

    expect(toPredictedBirthAt("2026-02-30", "21:10")).toBeNull();
    expect(toPredictedBirthAt("2026-09-15", "99:99")).toBeNull();
  });
});
