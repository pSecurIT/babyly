import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import { buildAddressesCsv } from "@/lib/csv";

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  console.info("[admin-audit] addresses_csv_exported");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adressen-export.csv"`,
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
