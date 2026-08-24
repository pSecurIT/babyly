"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";

export async function deleteParticipantAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin?error=ongeldig");
  }

  await prisma.participant.delete({ where: { id: participantId } });
  console.info(`[admin-audit] ${session.sub} deleted participant ${participantId}`);

  redirect("/admin?deleted=1");
}

export async function resetPredictionAction(formData: FormData) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const participantId = String(formData.get("participantId") || "");
  if (!participantId) {
    redirect("/admin?error=ongeldig");
  }

  await prisma.prediction.deleteMany({ where: { participantId } });
  console.info(`[admin-audit] ${session.sub} reset prediction for participant ${participantId}`);

  redirect("/admin?reset=1");
}

export async function purgeAllAction() {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  await prisma.$transaction([
    prisma.magicLinkToken.deleteMany({}),
    prisma.participant.deleteMany({}),
  ]);
  console.info(`[admin-audit] ${session.sub} purged all participant data`);

  redirect("/admin?purged=1");
}
