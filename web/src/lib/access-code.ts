import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { safeEqualHex, sha256Hex } from "@/lib/security";

const ACCESS_CODE_PRIMARY_ID = "primary";

export async function syncAccessCodeFromEnv() {
  const env = getEnv();
  const codeHash = sha256Hex(env.ACCESS_CODE.trim());

  await prisma.accessCode.upsert({
    where: { id: ACCESS_CODE_PRIMARY_ID },
    update: { codeHash },
    create: {
      id: ACCESS_CODE_PRIMARY_ID,
      codeHash,
    },
  });
}

export async function isValidAccessCode(plainTextCode: string): Promise<boolean> {
  const record = await prisma.accessCode.findUnique({
    where: { id: ACCESS_CODE_PRIMARY_ID },
    select: { codeHash: true },
  });

  if (!record) {
    return false;
  }

  const providedHash = sha256Hex(plainTextCode.trim());
  return safeEqualHex(providedHash, record.codeHash);
}
