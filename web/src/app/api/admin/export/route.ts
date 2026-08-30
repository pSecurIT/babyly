import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";

function csvEscape(value: string): string {
  if (/^\s*[=+\-@]/.test(value)) {
    value = `'${value}`;
  }

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
    select: {
      name: true,
      email: true,
      prediction: {
        select: {
          predictedName: true,
          gender: true,
          weightGrams: true,
          heightCm: true,
          predictedBirthAt: true,
        },
      },
      addressCard: {
        select: {
          recipientName: true,
          street: true,
          houseNumber: true,
          postalCode: true,
          city: true,
          country: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = toRow([
    "name",
    "email",
    "prediction_name",
    "prediction_gender",
    "prediction_weight_grams",
    "prediction_height_cm",
    "prediction_predicted_birth_at",
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
      participant.name ?? "",
      participant.email,
      prediction?.predictedName ?? "",
      prediction?.gender ?? "",
      prediction?.weightGrams ?? "",
      prediction?.heightCm ?? "",
      prediction ? prediction.predictedBirthAt.toISOString() : "",
      addressCard?.recipientName ?? "",
      addressCard?.street ?? "",
      addressCard?.houseNumber ?? "",
      addressCard?.postalCode ?? "",
      addressCard?.city ?? "",
      addressCard?.country ?? "",
    ]);
  });

  const csv = [header, ...rows].join("\n");
  console.info("[admin-audit] csv_exported");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deelnemers-export.csv"`,
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
