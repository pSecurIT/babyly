import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: () => mockCookies,
}));

import { createSessionValue, parseSessionValue, readGuestSession, readAdminSession, persistGuestSession, markCrossPromptSeen, clearSession } from "@/lib/session";

describe("session.ts - Session management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "abcdefghijklmnopqrstuvwx123456789012";
    vi.stubEnv("NODE_ENV", "development");
  });

  describe("createSessionValue / parseSessionValue", () => {
    it("creates and parses a valid guest session", () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      const parsed = parseSessionValue(sessionValue);

      expect(parsed).not.toBeNull();
      expect(parsed?.sub).toBe("participant-123");
      expect(parsed?.scope).toBe("guest");
      expect(parsed?.exp).toBeTypeOf("number");
      expect(parsed?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("creates and parses a valid admin session", () => {
      const sessionValue = createSessionValue("admin@example.com", "admin", 3600);
      const parsed = parseSessionValue(sessionValue);

      expect(parsed).not.toBeNull();
      expect(parsed?.sub).toBe("admin@example.com");
      expect(parsed?.scope).toBe("admin");
    });

    it("includes crossPromptSeen when provided", () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600, {
        predictionToAddress: true,
        addressToPrediction: false,
      });
      const parsed = parseSessionValue(sessionValue);

      expect(parsed?.crossPromptSeen?.predictionToAddress).toBe(true);
      expect(parsed?.crossPromptSeen?.addressToPrediction).toBe(false);
    });

    it("returns null for tampered signature", () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      const tampered = sessionValue.slice(0, -1) + (sessionValue.endsWith("0") ? "1" : "0");
      const parsed = parseSessionValue(tampered);
      expect(parsed).toBeNull();
    });

    it("returns null for expired session", () => {
      const sessionValue = createSessionValue("participant-123", "guest", -1);
      const parsed = parseSessionValue(sessionValue);
      expect(parsed).toBeNull();
    });

    it("returns null for invalid format", () => {
      expect(parseSessionValue("invalid")).toBeNull();
      expect(parseSessionValue("")).toBeNull();
      expect(parseSessionValue("no.dot.here")).toBeNull();
    });

    it("returns null for invalid scope", () => {
          const sessionValue = createSessionValue("test", "guest", 3600);
          // Create a session with invalid scope by tampering the payload
          const invalidSession = "eyJzdWIiOiJ0ZXN0Iiwic2NvcGUiOiJpbnZhbGlkIiwiZXhwIjo5OTk5OTk5OTk5fQ==.invalidsig";
          const parsed = parseSessionValue(invalidSession);
          expect(parsed).toBeNull();
        });
  });

  describe("readGuestSession", () => {
    it("returns parsed session when valid guest cookie exists", async () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });

      const session = await readGuestSession();
      expect(session).not.toBeNull();
      expect(session?.sub).toBe("participant-123");
      expect(session?.scope).toBe("guest");
    });

    it("returns null when no cookie", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const session = await readGuestSession();
      expect(session).toBeNull();
    });

    it("returns null when cookie is admin scope", async () => {
      const sessionValue = createSessionValue("admin@example.com", "admin", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });
      const session = await readGuestSession();
      expect(session).toBeNull();
    });

    it("returns null for expired session", async () => {
      const sessionValue = createSessionValue("participant-123", "guest", -1);
      mockCookies.get.mockReturnValue({ value: sessionValue });
      const session = await readGuestSession();
      expect(session).toBeNull();
    });
  });

  describe("readAdminSession", () => {
    it("returns parsed session when valid admin cookie exists", async () => {
      const sessionValue = createSessionValue("admin@example.com", "admin", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });

      const session = await readAdminSession();
      expect(session).not.toBeNull();
      expect(session?.sub).toBe("admin@example.com");
      expect(session?.scope).toBe("admin");
    });

    it("returns null when no cookie", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const session = await readAdminSession();
      expect(session).toBeNull();
    });

    it("returns null when cookie is guest scope", async () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });
      const session = await readAdminSession();
      expect(session).toBeNull();
    });
  });

  describe("persistGuestSession", () => {
    it("sets cookie with correct options", async () => {
      await persistGuestSession("participant-123");

      expect(mockCookies.set).toHaveBeenCalledWith(
        "baby_session",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // development
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        })
      );
    });

    it("sets secure=true when NODE_ENV is production", async () => {
      // Use vi.stubEnv to temporarily set NODE_ENV
      vi.stubEnv("NODE_ENV", "production");
      await persistGuestSession("participant-123");
      expect(mockCookies.set).toHaveBeenCalledWith(
        "baby_session",
        expect.any(String),
        expect.objectContaining({ secure: true })
      );
      vi.unstubAllEnvs();
    });
  });

  describe("markCrossPromptSeen", () => {
    it("updates crossPromptSeen flag and persists cookie", async () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });

      await markCrossPromptSeen("predictionToAddress");

      expect(mockCookies.set).toHaveBeenCalledWith(
        "baby_session",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        })
      );
    });

    it("does nothing when no guest session", async () => {
      mockCookies.get.mockReturnValue(undefined);
      await markCrossPromptSeen("predictionToAddress");
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    it("updates both directions correctly", async () => {
      const sessionValue = createSessionValue("participant-123", "guest", 3600);
      mockCookies.get.mockReturnValue({ value: sessionValue });

      await markCrossPromptSeen("addressToPrediction");
      await markCrossPromptSeen("predictionToAddress");

      expect(mockCookies.set).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearSession", () => {
    it("deletes the session cookie", async () => {
      await clearSession();
      expect(mockCookies.delete).toHaveBeenCalledWith("baby_session");
    });
  });
});