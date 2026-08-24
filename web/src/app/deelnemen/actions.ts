"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";
import { addressInputSchema, predictionInputSchema, toPredictedBirthAt } from "@/lib/validation";

export async function submitPredictionAction(formData: FormData) {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const parsed = predictionInputSchema.safeParse({
    name: formData.get("name"),
    gender: formData.get("gender"),
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    birthDate: formData.get("birthDate"),
    birthTime: formData.get("birthTime"),
  });

  if (!parsed.success) {
    redirect("/deelnemen/voorspelling/formulier?error=validatie");
  }

  const predictedBirthAt = toPredictedBirthAt(parsed.data.birthDate, parsed.data.birthTime);
  if (!predictedBirthAt) {
    redirect("/deelnemen/voorspelling/formulier?error=datumtijd");
  }

  const weightGrams = Math.round(parsed.data.weightKg * 1000);

  const result = await prisma.$transaction(async (tx) => {
    await tx.participant.update({
      where: { id: session.sub },
      data: { name: parsed.data.name },
    });

    const existing = await tx.prediction.findUnique({
      where: { participantId: session.sub },
    });

    if (!existing) {
      await tx.prediction.create({
        data: {
          participantId: session.sub,
          gender: parsed.data.gender,
          weightGrams,
          heightCm: parsed.data.heightCm,
          predictedBirthAt,
          editCount: 0,
        },
      });
      return "created" as const;
    }

    if (existing.editCount >= 1 || existing.lockedAt) {
      return "locked" as const;
    }

    await tx.prediction.update({
      where: { participantId: session.sub },
      data: {
        gender: parsed.data.gender,
        weightGrams,
        heightCm: parsed.data.heightCm,
        predictedBirthAt,
        editCount: { increment: 1 },
        lockedAt: new Date(),
      },
    });

    return "updated" as const;
  });

  if (result === "locked") {
    redirect("/deelnemen/voorspelling/formulier?error=definitief");
  }

  if (result === "updated") {
    redirect("/deelnemen/voorspelling/bedankt");
  }

  redirect("/deelnemen/voorspelling/bedankt");
}

export async function submitAddressAction(formData: FormData) {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const parsed = addressInputSchema.safeParse({
    recipientName: formData.get("recipientName"),
    street: formData.get("street"),
    houseNumber: formData.get("houseNumber"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
  });

  if (!parsed.success) {
    redirect("/deelnemen/adres/formulier?error=validatie");
  }

  const existing = await prisma.addressCard.findUnique({
    where: { participantId: session.sub },
    select: { id: true },
  });

  if (existing) {
    redirect("/deelnemen/adres/formulier?error=bestaat");
  }

  await prisma.addressCard.create({
    data: {
      participantId: session.sub,
      recipientName: parsed.data.recipientName,
      street: parsed.data.street,
      houseNumber: parsed.data.houseNumber,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      country: parsed.data.country,
    },
  });

  redirect("/deelnemen/adres/formulier?saved=1&cross=voorspelling");
}
