import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSend, mockGetEnv } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetEnv: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/env", () => ({
  getEnv: mockGetEnv,
}));

vi.mock("@/lib/security", () => ({
  sha256Hex: vi.fn(() => "link-hash"),
}));

import { sendMagicLink, sendTestEmail } from "@/lib/email";

describe("transactionele e-mail", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetEnv.mockReset();
  });

  it("verstuurd gast magic link via Resend", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });

    await sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.example.invalid/api/auth/verify?token=secret",
      purpose: "guest",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Babyly <baby@example.invalid>",
        to: ["guest@example.com"],
        subject: "Je eenmalige Babyly-link",
        text: expect.stringContaining("token=secret"),
        html: expect.stringContaining("background:#f3fbf1"),
      }),
      { idempotencyKey: "magic-link/link-hash" },
    );
    expect(mockSend.mock.calls[0][0].html).toContain("https://baby.example.invalid/api/auth/verify?token=secret");
    expect(mockSend.mock.calls[0][0].html).toContain("background:#fff8df");
    expect(mockSend.mock.calls[0][0].html).toContain("background:#67c96f");
  });

  it("normaliseert Resend-fouten zonder provider-details te lekken", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockRejectedValue(new Error("provider secret detail"));

    await expect(sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.example.invalid/verify?token=secret",
      purpose: "guest",
    })).rejects.toThrow("Transactionele e-mail kon niet worden verstuurd.");
  });

  it("gebruikt console-modus voor lokale ontwikkeling", async () => {
    mockGetEnv.mockReturnValue({ EMAIL_DELIVERY_MODE: "console" });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await sendMagicLink({
      email: "guest@example.com",
      link: "http://localhost:3000/verify?token=secret",
      purpose: "guest",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "[magic-link:guest] guest@example.com -> http://localhost:3000/verify?token=secret",
    );
    infoSpy.mockRestore();
  });

  it("stuurt een eenvoudige testmail via Resend", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
      EMAIL_TEST_RECIPIENT: "test@example.com",
    });
    mockSend.mockResolvedValue({ data: { id: "email-test-1" }, error: null });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendTestEmail()).resolves.toBe("email-test-1");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Babyly e-mailtest",
        to: ["test@example.com"],
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^email-test\//) }),
    );
    expect(infoSpy).toHaveBeenCalledWith("[email-test] sending");
    expect(infoSpy).toHaveBeenCalledWith("[email-test] sent", { messageId: "email-test-1" });
    expect(infoSpy.mock.calls.flat().join(" ")).not.toContain("test@example.com");
    infoSpy.mockRestore();
  });

  // --- Extended coverage ---

  it("verstuurd admin magic link via Resend met correct template", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockResolvedValue({ data: { id: "email-admin-1" }, error: null });

    await sendMagicLink({
      email: "admin@example.com",
      link: "https://baby.example.invalid/api/auth/verify?token=admin-token&scope=admin",
      purpose: "admin",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Je eenmalige Babyly-adminlink",
        html: expect.stringContaining("Je Babyly-adminlink is er"),
      }),
      expect.any(Object),
    );
  });

  it("logs provider_accepted met messageId op succes", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockResolvedValue({ data: { id: "msg-accepted-123" }, error: null });

    await sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.test/verify?token=abc",
      purpose: "guest",
    });

    expect(consoleSpy).toHaveBeenCalledWith("[email] provider_accepted", { messageId: "msg-accepted-123" });
    consoleSpy.mockRestore();
  });

  it("logs provider_failed en throwt gegeneraliseerde fout bij Resend error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockRejectedValue(new Error("network timeout"));

    await expect(sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.test/verify?token=abc",
      purpose: "guest",
    })).rejects.toThrow("Transactionele e-mail kon niet worden verstuurd.");

    expect(consoleSpy).toHaveBeenCalledWith("[email] provider_failed");
    consoleSpy.mockRestore();
  });

  it("logs provider_rejected en throwt gegeneraliseerde fout bij Resend error response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockResolvedValue({ data: null, error: { message: "invalid api key" } });

    await expect(sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.test/verify?token=abc",
      purpose: "guest",
    })).rejects.toThrow("Transactionele e-mail kon niet worden verstuurd.");

    expect(consoleSpy).toHaveBeenCalledWith("[email] provider_rejected");
    consoleSpy.mockRestore();
  });

  it("genereert unieke idempotency key voor sendTestEmail per aanroep", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
      EMAIL_TEST_RECIPIENT: "test@example.com",
    });
    mockSend
      .mockResolvedValueOnce({ data: { id: "msg-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "msg-2" }, error: null });

    await sendTestEmail();
    await sendTestEmail();

    const keys = mockSend.mock.calls.map((c) => c[1].idempotencyKey);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toMatch(/^email-test\/\d+\//);
    expect(keys[1]).toMatch(/^email-test\/\d+\//);
  });

  it("throwt duidelijke fout wanneer RESEND_API_KEY ontbreekt bij sendTestEmail", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
      EMAIL_TEST_RECIPIENT: "test@example.com",
    });

    await expect(sendTestEmail()).rejects.toThrow("Testmail is niet geconfigureerd.");
  });

  it("throwt duidelijke fout wanneer EMAIL_FROM ontbreekt bij sendTestEmail", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_TEST_RECIPIENT: "test@example.com",
    });

    await expect(sendTestEmail()).rejects.toThrow("Testmail is niet geconfigureerd.");
  });

  it("throwt duidelijke fout wanneer EMAIL_TEST_RECIPIENT ontbreekt bij sendTestEmail", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });

    await expect(sendTestEmail()).rejects.toThrow("Testmail is niet geconfigureerd.");
  });

  it("logs provider_failed en throwt bij Resend error in sendTestEmail", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
      EMAIL_TEST_RECIPIENT: "test@example.com",
    });
    mockSend.mockRejectedValue(new Error("send failed"));

    await expect(sendTestEmail()).rejects.toThrow("Testmail kon niet worden verstuurd.");
    expect(consoleSpy).toHaveBeenCalledWith("[email-test] provider_failed");
    consoleSpy.mockRestore();
  });

  it("logs provider_rejected en throwt bij Resend error response in sendTestEmail", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockGetEnv.mockReturnValue({
        EMAIL_DELIVERY_MODE: "provider",
        RESEND_API_KEY: "test-api-key",
        EMAIL_FROM: "Babyly <baby@example.invalid>",
        EMAIL_TEST_RECIPIENT: "test@example.com",
      });
      mockSend.mockResolvedValue({ data: null, error: { message: "rate limited" } });

      await expect(sendTestEmail()).rejects.toThrow("Testmail kon niet worden verstuurd.");
      expect(consoleSpy).toHaveBeenCalledWith("[email-test] provider_failed");
      consoleSpy.mockRestore();
    });

  it("genereert idempotency key vanuit link hash voor magic link", async () => {
    mockGetEnv.mockReturnValue({
      EMAIL_DELIVERY_MODE: "provider",
      RESEND_API_KEY: "test-api-key",
      EMAIL_FROM: "Babyly <baby@example.invalid>",
    });
    mockSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });

    await sendMagicLink({
      email: "guest@example.com",
      link: "https://baby.test/verify?token=abc",
      purpose: "guest",
    });

    const call = mockSend.mock.calls[0];
    const options = call[1];
    expect(options.idempotencyKey).toBe("magic-link/link-hash");
  });
});