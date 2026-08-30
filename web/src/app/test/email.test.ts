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
});