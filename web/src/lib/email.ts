type SendMagicLinkInput = {
  email: string;
  link: string;
  purpose: "guest" | "admin";
};

export async function sendMagicLink(input: SendMagicLinkInput) {
  if (process.env.EMAIL_DELIVERY_MODE === "provider") {
    throw new Error("EMAIL_DELIVERY_MODE=provider is nog niet geconfigureerd.");
  }

  // Dev-safe default: log link server-side instead of sending mail.
  console.info(`[magic-link:${input.purpose}] ${input.email} -> ${input.link}`);
}
