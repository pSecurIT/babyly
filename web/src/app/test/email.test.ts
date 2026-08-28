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

import { sendMagicLink } from "@/lib/email";

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

    expect(mockSend).toHaveBeenCalledWith({
      from: "Babyly <baby@example.invalid>",
      to: ["guest@example.com"],
      subject: "Je eenmalige Babyly-link",
      text: expect.stringContaining("token=secret"),
    });
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
});