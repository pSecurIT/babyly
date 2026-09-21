import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import { buildPredictionsCsv } from "@/lib/csv";

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  console.info("[admin-audit] predictions_csv_exported");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voorspellingen-export.csv"`,
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
