import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function isValidSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export function safeEqualHex(left: string, right: string): boolean {
  if (!isValidSha256Hex(left) || !isValidSha256Hex(right)) {
    return false;
  }

  const leftBuf = Buffer.from(left, "hex");
  const rightBuf = Buffer.from(right, "hex");

  if (leftBuf.length !== rightBuf.length) {
    return false;
  }

  return timingSafeEqual(leftBuf, rightBuf);
}

export function generateRandomToken(): string {
  return randomBytes(32).toString("hex");
}

export function hmacSha256Hex(secret: string, input: string): string {
  return createHmac("sha256", secret).update(input, "utf8").digest("hex");
}
