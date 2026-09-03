import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { FullConfig } from "@playwright/test";

const authDirectory = join(process.cwd(), "e2e", ".auth");
const storageStatePath = join(authDirectory, "guest.json");

export default async function globalSetup(config: FullConfig) {
  if (process.env.E2E_RUN_FULL !== "1") {
    return;
  }

  const [{ prisma }, { createSessionValue }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/session"),
  ]);

  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  const hostname = new URL(baseURL).hostname;
  const csrfToken = randomBytes(32).toString("hex");
  const email = `e2e-${Date.now()}-${crypto.randomUUID()}@example.invalid`;
  const participant = await prisma.participant.create({
    data: {
      email,
      name: "E2E Test",
      emailVerifiedAt: new Date(),
    },
  });

  try {
    await mkdir(authDirectory, { recursive: true });
    await writeFile(storageStatePath, JSON.stringify({
      cookies: [{
        name: "baby_session",
        value: createSessionValue(participant.id, "guest", 60 * 60),
        domain: hostname,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      }, {
        name: "baby_csrf",
        value: csrfToken,
        domain: hostname,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      }],
      origins: [],
    }, null, 2));
  } catch (error) {
    await prisma.participant.delete({ where: { id: participant.id } });
    await prisma.$disconnect();
    throw error;
  }

  return async () => {
    await prisma.participant.delete({ where: { id: participant.id } });
    await rm(authDirectory, { recursive: true, force: true });
    await prisma.$disconnect();
  };
}