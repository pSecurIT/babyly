import { prisma } from "@/lib/db";
import { sendAddressReminder } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { generateRandomToken, sha256Hex } from "@/lib/security";

export const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const REMINDER_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ReminderResult = "sent" | "skipped";

export function isInCooldown(reminderSentAt: Date | null, now = Date.now()): boolean {
  return reminderSentAt !== null && now - reminderSentAt.getTime() < REMINDER_COOLDOWN_MS;
}

export async function findReminderTargets() {
  return prisma.participant.findMany({
    where: { prediction: { isNot: null }, addressCard: null },
    select: { id: true, name: true, email: true, reminderSentAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

// Re-checks the address and cooldown right before sending; throws if delivery fails.
export async function sendReminderTo(participantId: string): Promise<ReminderResult> {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      name: true,
      email: true,
      reminderSentAt: true,
      prediction: { select: { id: true } },
      addressCard: { select: { id: true } },
    },
  });

  if (!participant || !participant.prediction || participant.addressCard || isInCooldown(participant.reminderSentAt)) {
    return "skipped";
  }

  const token = generateRandomToken();
  await prisma.magicLinkToken.create({
    data: {
      email: participant.email,
      tokenHash: sha256Hex(token),
      purpose: "guest_login",
      expiresAt: new Date(Date.now() + REMINDER_LINK_TTL_MS),
      participantId: participant.id,
    },
  });

  const url = new URL("/api/auth/verify", getEnv().APP_BASE_URL);
  url.searchParams.set("token", token);
  url.searchParams.set("email", participant.email);
  if (participant.name) {
    url.searchParams.set("name", participant.name);
  }
  url.searchParams.set("scope", "guest");
  url.searchParams.set("next", "/deelnemen/adres/formulier");

  await sendAddressReminder({
    participantId: participant.id,
    email: participant.email,
    name: participant.name,
    link: url.toString(),
  });

  await prisma.participant.update({
    where: { id: participant.id },
    data: { reminderSentAt: new Date() },
  });

  return "sent";
}
