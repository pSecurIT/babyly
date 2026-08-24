import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(values: (string | number)[]): string {
  return values.map((value) => csvEscape(String(value))).join(",");
}

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const participants = await prisma.participant.findMany({
    include: { prediction: true, addressCard: true },
    orderBy: { createdAt: "asc" },
  });

  const header = toRow([
    "participant_id",
    "name",
    "email",
    "email_verified_at",
    "prediction_gender",
    "prediction_weight_grams",
    "prediction_height_cm",
    "prediction_predicted_birth_at",
    "prediction_edit_count",
    "prediction_locked_at",
    "address_recipient_name",
    "address_street",
    "address_house_number",
    "address_postal_code",
    "address_city",
    "address_country",
  ]);

  const rows = participants.map((participant) => {
    const prediction = participant.prediction;
    const addressCard = participant.addressCard;

    return toRow([
      participant.id,
      participant.name ?? "",
      participant.email,
      participant.emailVerifiedAt?.toISOString() ?? "",
      prediction?.gender ?? "",
      prediction?.weightGrams ?? "",
      prediction?.heightCm ?? "",
      prediction ? prediction.predictedBirthAt.toISOString() : "",
      prediction?.editCount ?? "",
      prediction?.lockedAt?.toISOString() ?? "",
      addressCard?.recipientName ?? "",
      addressCard?.street ?? "",
      addressCard?.houseNumber ?? "",
      addressCard?.postalCode ?? "",
      addressCard?.city ?? "",
      addressCard?.country ?? "",
    ]);
  });

  const csv = [header, ...rows].join("\n");
  console.info(`[admin-audit] ${session.sub} exported CSV (${participants.length} participants)`);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deelnemers-export.csv"`,
    },
  });
}
