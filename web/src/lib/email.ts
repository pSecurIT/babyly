import { Resend } from "resend";
import { getEnv } from "@/lib/env";

type SendMagicLinkInput = {
  email: string;
  link: string;
  purpose: "guest" | "admin";
};

export async function sendMagicLink(input: SendMagicLinkInput) {
  const env = getEnv();

  if (env.EMAIL_DELIVERY_MODE === "provider") {
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const result = await resend.emails.send({
        from: env.EMAIL_FROM!,
        to: [input.email],
        subject: input.purpose === "admin"
          ? "Je eenmalige Babyly-adminlink"
          : "Je eenmalige Babyly-link",
        text: [
          "Hallo,",
          "",
          "Gebruik deze eenmalige link om verder te gaan:",
          input.link,
          "",
          "De link is tijdelijk geldig en kan maar eenmaal worden gebruikt.",
        ].join("\n"),
      });

      if (!result.error) {
        return;
      }
    } catch {
      throw new Error("Transactionele e-mail kon niet worden verstuurd.");
    }

    throw new Error("Transactionele e-mail kon niet worden verstuurd.");
  }

  // Local-only fallback; production must use the provider mode.
  console.info(`[magic-link:${input.purpose}] ${input.email} -> ${input.link}`);
}
