"use server";

import { redirect } from "next/navigation";
import { CLEAR_ADDRESSES_PHRASE, CLEAR_ALL_PHRASE, CLEAR_PREDICTIONS_PHRASE } from "@/lib/admin-clear-phrases";
import { csrfTokenFromForm, validateCsrfToken } from "@/lib/csrf";
import { buildAddressesCsv, buildPredictionsCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { sendCsvEmail } from "@/lib/email";
import { readAdminSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { findReminderTargets, sendReminderTo } from "@/lib/reminders";
import { confirmPhraseFieldSchema } from "@/lib/validation";

export async function deleteParticipantAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }

  await prisma.participant.delete({ where: { id: participantId } });
  console.info("[admin-audit] participant_deleted");

  redirect("/admin/voorspellingen?deleted=1");
}

export async function resetPredictionAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }

  await prisma.prediction.deleteMany({ where: { participantId } });
  console.info("[admin-audit] prediction_reset");

  redirect("/admin/voorspellingen?reset=1");
}

export async function purgeAllAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin?error=ongeldig");
  }
  const confirmParsed = confirmPhraseFieldSchema.safeParse({ confirm: formData.get("confirm") });
  if (!confirmParsed.success || confirmParsed.data.confirm !== CLEAR_ALL_PHRASE) {
    redirect("/admin?error=bevestiging");
  }

  await prisma.$transaction([
    prisma.magicLinkToken.deleteMany({}),
    prisma.participant.deleteMany({}),
  ]);
  console.info("[admin-audit] participant_data_purged");

  redirect("/admin?purged=1");
}

export async function clearPredictionsAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }
  const confirmParsed = confirmPhraseFieldSchema.safeParse({ confirm: formData.get("confirm") });
  if (!confirmParsed.success || confirmParsed.data.confirm !== CLEAR_PREDICTIONS_PHRASE) {
    redirect("/admin/voorspellingen?error=bevestiging");
  }

  await prisma.prediction.deleteMany({});
  console.info("[admin-audit] predictions_cleared");

  redirect("/admin/voorspellingen?cleared=1");
}

export async function resetAddressAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/adressen?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin/adressen?error=ongeldig");
  }

  await prisma.addressCard.deleteMany({ where: { participantId } });
  console.info("[admin-audit] address_reset");

  redirect("/admin/adressen?reset=1");
}

export async function deleteAddressParticipantAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/adressen?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin/adressen?error=ongeldig");
  }

  await prisma.participant.delete({ where: { id: participantId } });
  console.info("[admin-audit] participant_deleted");

  redirect("/admin/adressen?deleted=1");
}

export async function clearAddressesAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/adressen?error=ongeldig");
  }
  const confirmParsed = confirmPhraseFieldSchema.safeParse({ confirm: formData.get("confirm") });
  if (!confirmParsed.success || confirmParsed.data.confirm !== CLEAR_ADDRESSES_PHRASE) {
    redirect("/admin/adressen?error=bevestiging");
  }

  await prisma.addressCard.deleteMany({});
  console.info("[admin-audit] addresses_cleared");

  redirect("/admin/adressen?cleared=1");
}

export async function mailPredictionsCsvAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/voorspellingen?error=ongeldig");
  }

  const predictions = await prisma.prediction.findMany({
    select: {
      predictedName: true,
      gender: true,
      weightGrams: true,
      heightCm: true,
      predictedBirthAt: true,
      createdAt: true,
      participant: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const csv = buildPredictionsCsv(predictions);

  try {
    await sendCsvEmail({
      subject: "Babyly voorspellingen-export",
      filename: "voorspellingen-export.csv",
      csv,
    });
  } catch {
    redirect("/admin/voorspellingen?error=mail");
  }

  console.info("[admin-audit] predictions_csv_emailed");
  redirect("/admin/voorspellingen?mailed=1");
}

export async function mailAddressesCsvAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/adressen?error=ongeldig");
  }

  const addresses = await prisma.addressCard.findMany({
    select: {
      recipientName: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      country: true,
      createdAt: true,
      participant: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const csv = buildAddressesCsv(addresses);

  try {
    await sendCsvEmail({
      subject: "Babyly adressen-export",
      filename: "adressen-export.csv",
      csv,
    });
  } catch {
    redirect("/admin/adressen?error=mail");
  }

  console.info("[admin-audit] addresses_csv_emailed");
  redirect("/admin/adressen?mailed=1");
}

export async function sendAddressReminderAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/email?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin/email?error=ongeldig");
  }
  if (!rateLimit(`admin-reminder:${session.sub}`, 60, 10 * 60 * 1000).allowed) {
    redirect("/admin/email?error=limiet");
  }

  let result: "sent" | "skipped";
  try {
    result = await sendReminderTo(participantId);
  } catch {
    redirect("/admin/email?error=mail");
  }

  console.info(`[admin-audit] address_reminder_${result}`);
  redirect(result === "sent" ? "/admin/email?reminded=1&skipped=0" : "/admin/email?reminded=0&skipped=1");
}

export async function sendAllAddressRemindersAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin/email?error=ongeldig");
  }
  if (formData.get("confirm") !== "yes") {
    redirect("/admin/email?error=bevestiging");
  }
  if (!rateLimit(`admin-reminder-bulk:${session.sub}`, 5, 10 * 60 * 1000).allowed) {
    redirect("/admin/email?error=limiet");
  }

  const targets = await findReminderTargets();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // Sequential on purpose to stay within provider rate limits.
  for (const target of targets) {
    try {
      const result = await sendReminderTo(target.id);
      if (result === "sent") {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  console.info(`[admin-audit] address_reminders_bulk sent=${sent} skipped=${skipped} failed=${failed}`);
  redirect(`/admin/email?reminded=${sent}&skipped=${skipped}&failed=${failed}`);
}
