"use server";

import { redirect } from "next/navigation";
import { csrfTokenFromForm, validateCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { markCrossPromptSeen, readGuestSession } from "@/lib/session";
import { addressInputSchema, predictionInputSchema, toPredictedBirthAt } from "@/lib/validation";
import { getEnv } from "@/lib/env";

export async function submitPredictionAction(formData: FormData) {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/deelnemen/voorspelling/formulier?error=ongeldig");
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

  const env = getEnv();
  const deadlineDate = new Date(env.PREDICTION_DEADLINE_DATE);
  if (new Date() > deadlineDate) {
    redirect("/deelnemen/voorspelling/formulier?error=verlopen");
  }

  const weightGrams = Math.round(parsed.data.weightKg * 1000);

    await prisma.$transaction(async (tx) => {
    const existing = await tx.prediction.findUnique({
      where: { participantId: session.sub },
    });

    if (!existing) {
      await tx.prediction.create({
        data: {
          participantId: session.sub,
          predictedName: parsed.data.name,
          gender: parsed.data.gender,
          weightGrams,
          heightCm: parsed.data.heightCm,
          predictedBirthAt,
        },
      });
      return "created" as const;
    }

    await tx.prediction.update({
      where: { participantId: session.sub },
      data: {
        predictedName: parsed.data.name,
        gender: parsed.data.gender,
        weightGrams,
        heightCm: parsed.data.heightCm,
        predictedBirthAt,
      },
    });

    return "updated" as const;
  });

  await markCrossPromptSeen("predictionToAddress");
  redirect("/deelnemen/voorspelling/bedankt");
}

export async function submitAddressAction(formData: FormData) {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/deelnemen/adres/formulier?error=ongeldig");
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
    await prisma.addressCard.update({
      where: { id: existing.id },
      data: {
        recipientName: parsed.data.recipientName,
        street: parsed.data.street,
        houseNumber: parsed.data.houseNumber,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        country: parsed.data.country,
      },
    });
  } else {
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
  }

  await markCrossPromptSeen("addressToPrediction");
  redirect("/deelnemen/adres/bedankt");
}
