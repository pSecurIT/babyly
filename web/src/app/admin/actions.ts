"use server";

import { redirect } from "next/navigation";
import { csrfTokenFromForm, validateCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";

export async function deleteParticipantAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin?error=ongeldig");
  }

  await prisma.participant.delete({ where: { id: participantId } });
  console.info("[admin-audit] participant_deleted");

  redirect("/admin?deleted=1");
}

export async function resetPredictionAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin?error=ongeldig");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin?error=ongeldig");
  }

  await prisma.prediction.deleteMany({ where: { participantId } });
  console.info("[admin-audit] prediction_reset");

  redirect("/admin?reset=1");
}

export async function purgeAllAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect("/admin?error=ongeldig");
  }

  await prisma.$transaction([
    prisma.magicLinkToken.deleteMany({}),
    prisma.participant.deleteMany({}),
  ]);
  console.info("[admin-audit] participant_data_purged");

  redirect("/admin?purged=1");
}
