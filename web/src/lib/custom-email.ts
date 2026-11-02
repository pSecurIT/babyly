import { z } from "zod";

export const MAX_RECIPIENTS = 200;

const emailSchema = z.string().email().max(320);

export function parseExtraEmails(raw: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const part of raw.split(/[\s,;]+/)) {
    const candidate = part.trim().toLowerCase();
    if (!candidate) continue;
    if (emailSchema.safeParse(candidate).success) {
      valid.add(candidate);
    } else {
      invalid.push(part.trim().slice(0, 60));
    }
  }

  return { valid: Array.from(valid), invalid };
}

export type Recipient = { email: string; name: string | null; participantId: string | null };

// Participants win over extra addresses with the same email; the list is deduplicated.
export function mergeRecipients(
  participants: { id: string; email: string; name: string | null }[],
  extraEmails: string[],
): Recipient[] {
  const byEmail = new Map<string, Recipient>();
  for (const participant of participants) {
    byEmail.set(participant.email.toLowerCase(), {
      email: participant.email,
      name: participant.name,
      participantId: participant.id,
    });
  }
  for (const email of extraEmails) {
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, name: null, participantId: null });
    }
  }
  return Array.from(byEmail.values());
}
