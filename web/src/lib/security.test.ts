import { describe, expect, it } from "vitest";
import { generateRandomToken, sha256Hex, hmacSha256Hex, safeEqualHex } from "@/lib/security";

describe("security.ts - crypto utilities", () => {
  describe("generateRandomToken", () => {
    it("generates 32 bytes = 64 hex chars", () => {
      const token = generateRandomToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/i);
    });

    it("generates different tokens on each call", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateRandomToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe("sha256Hex", () => {
    it("produces deterministic 64-char hex output", () => {
      const hash1 = sha256Hex("test input");
      const hash2 = sha256Hex("test input");
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different inputs", () => {
      expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
    });

    it("handles empty string", () => {
      const hash = sha256Hex("");
      expect(hash).toHaveLength(64);
    });

    it("handles unicode input", () => {
      const hash = sha256Hex("🎉🌱👶");
      expect(hash).toHaveLength(64);
    });

    it("matches known test vector (SHA-256 of 'abc')", () => {
      expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    });
  });

  describe("hmacSha256Hex", () => {
    it("produces deterministic output for same key + message", () => {
      const key = "secret-key";
      const msg = "message";
      expect(hmacSha256Hex(key, msg)).toBe(hmacSha256Hex(key, msg));
    });

    it("produces different output for different keys", () => {
      expect(hmacSha256Hex("key1", "msg")).not.toBe(hmacSha256Hex("key2", "msg"));
    });

    it("produces different output for different messages", () => {
      expect(hmacSha256Hex("key", "msg1")).not.toBe(hmacSha256Hex("key", "msg2"));
    });

    it("output is 64-char hex", () => {
      expect(hmacSha256Hex("k", "m")).toHaveLength(64);
      expect(hmacSha256Hex("k", "m")).toMatch(/^[a-f0-9]{64}$/);
    });

    it("handles empty key and message", () => {
      const hash = hmacSha256Hex("", "");
      expect(hash).toHaveLength(64);
    });
  });

  describe("safeEqualHex", () => {
    const validHash = "a".repeat(64);
    const validHash2 = "b".repeat(64);

    it("returns true for identical valid SHA-256 hex strings", () => {
      expect(safeEqualHex(validHash, validHash)).toBe(true);
      expect(safeEqualHex(validHash2, validHash2)).toBe(true);
    });

    it("returns false for different valid SHA-256 hex strings", () => {
      expect(safeEqualHex(validHash, validHash2)).toBe(false);
    });

    it("returns false for invalid hex strings (wrong length)", () => {
      expect(safeEqualHex("abcdef", "abcdef")).toBe(false);
      expect(safeEqualHex("abc", "abcd")).toBe(false);
    });

    it("returns false for non-hex characters", () => {
      expect(safeEqualHex("g".repeat(64), "a".repeat(64))).toBe(false);
    });

    it("is case-insensitive for valid hex", () => {
      const lower = "a".repeat(64);
      const upper = "A".repeat(64);
      expect(safeEqualHex(lower, upper)).toBe(true);
    });

    it("constant-time comparison (no early return on length mismatch)", () => {
      const short = "a".repeat(10);
      const long = "a".repeat(100);
      const start = performance.now();
      safeEqualHex(short, long);
      const shortTime = performance.now() - start;

      const start2 = performance.now();
      safeEqualHex(validHash, validHash);
      const longTime = performance.now() - start2;

      expect(Math.abs(shortTime - longTime)).toBeLessThan(50);
    });
  });
});