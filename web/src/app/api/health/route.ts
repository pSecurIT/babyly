import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// Used by the deploy smoke test: proves the app is up, reaches the database and runs the expected build.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.error("[health] database_unreachable");
    return NextResponse.json({ status: "error" }, { status: 503, headers: NO_STORE });
  }

  return NextResponse.json({ status: "ok", sha: process.env.GIT_SHA ?? "unknown" }, { headers: NO_STORE });
}
