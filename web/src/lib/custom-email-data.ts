import { prisma } from "@/lib/db";
import type { PickerParticipant } from "@/components/admin/RecipientPicker";

export async function loadPickerParticipants(): Promise<PickerParticipant[]> {
  const participants = await prisma.participant.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      prediction: { select: { id: true } },
      addressCard: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    email: participant.email,
    hasPrediction: participant.prediction !== null,
    hasAddress: participant.addressCard !== null,
  }));
}
