import { Resend } from "resend";
import { getEnv } from "@/lib/env";
import { sha256Hex } from "@/lib/security";

type SendMagicLinkInput = {
  email: string;
  link: string;
  purpose: "guest" | "admin";
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function magicLinkHtml(input: SendMagicLinkInput): string {
  const safeLink = escapeHtml(input.link);
  const title = input.purpose === "admin"
    ? "Je Babyly-adminlink is er"
    : "Klaar voor een klein Babyly-moment?";
  const intro = input.purpose === "admin"
    ? "Met deze link open je veilig de Babyly-adminomgeving."
    : "Met deze link ga je veilig verder naar jouw Babyly-avontuur.";
  const buttonLabel = input.purpose === "admin"
    ? "Adminomgeving openen"
    : "Naar Babyly gaan";

  return `<!doctype html>
<html lang="nl">
  <body style="margin:0;background:#f3fbf1;color:#244a37;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;background:#f3fbf1;background-image:radial-gradient(circle at 12% 8%,#dff5d9 0,transparent 22%),radial-gradient(circle at 88% 10%,#fff1c9 0,transparent 20%);">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Je eenmalige Babyly-link staat voor je klaar.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
        <tr>
          <td style="padding:0 0 16px;text-align:center;">
            <span style="display:inline-block;padding:12px 20px;border-radius:24px;background:#ffffff;color:#234a37;font-size:24px;font-weight:800;letter-spacing:-.5px;box-shadow:0 8px 20px rgba(61,94,72,.10);">👶 Babyly</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;border:2px solid #cfecc7;border-radius:28px;background:#ffffff;box-shadow:0 18px 40px rgba(61,94,72,.14);">
            <div style="margin-bottom:24px;text-align:center;font-size:34px;line-height:1;">🌼 ✨ 🌱</div>
            <p style="margin:0 0 10px;text-align:center;color:#4a9d61;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">een klein berichtje</p>
            <h1 style="margin:0;text-align:center;color:#234a37;font-size:30px;line-height:1.2;">${title}</h1>
            <p style="margin:20px 0 0;text-align:center;color:#3c594b;font-size:17px;line-height:1.6;">${intro}</p>
            <div style="margin:28px 0;padding:18px 20px;border:1px solid #f8d88b;border-radius:18px;background:#fff8df;color:#5f4d1a;text-align:center;font-size:15px;line-height:1.5;">Deze link is tijdelijk geldig en kan maar één keer worden gebruikt.</div>
            <div style="text-align:center;">
              <a href="${safeLink}" style="display:inline-block;padding:16px 26px;border-radius:20px;background:#67c96f;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;box-shadow:0 10px 22px rgba(84,157,100,.28);">${buttonLabel} →</a>
            </div>
            <p style="margin:26px 0 0;color:#6c8576;text-align:center;font-size:13px;line-height:1.5;">Werkt de knop niet? Kopieer dan deze link naar je browser:<br><span style="color:#4a9d61;word-break:break-all;">${safeLink}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 16px 0;color:#6c8576;text-align:center;font-size:12px;line-height:1.5;">Met liefde gemaakt voor dit bijzondere geboortemoment 💚</td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

export async function sendMagicLink(input: SendMagicLinkInput) {
  const env = getEnv();

  if (env.EMAIL_DELIVERY_MODE === "provider") {
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const text = [
        "Hallo,",
        "",
        "Gebruik deze eenmalige link om verder te gaan:",
        input.link,
        "",
        "De link is tijdelijk geldig en kan maar eenmaal worden gebruikt.",
      ].join("\n");
      const result = await resend.emails.send({
        from: env.EMAIL_FROM!,
        to: [input.email],
        subject: input.purpose === "admin"
          ? "Je eenmalige Babyly-adminlink"
          : "Je eenmalige Babyly-link",
        text,
        html: magicLinkHtml(input),
      }, {
        idempotencyKey: `magic-link/${sha256Hex(input.link)}`,
      });

      if (!result.error) {
        console.info("[email] provider_accepted", { messageId: result.data?.id ?? "unknown" });
        return;
      }
    } catch {
      console.error("[email] provider_failed");
      throw new Error("Transactionele e-mail kon niet worden verstuurd.");
    }

    console.error("[email] provider_rejected");
    throw new Error("Transactionele e-mail kon niet worden verstuurd.");
  }

  // Local-only fallback; production must use the provider mode.
  console.info(`[magic-link:${input.purpose}] ${input.email} -> ${input.link}`);
}

export async function sendTestEmail() {
  const env = getEnv();
  if (env.EMAIL_DELIVERY_MODE !== "provider" || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_TEST_RECIPIENT) {
    throw new Error("Testmail is niet geconfigureerd.");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const idempotencyKey = `email-test/${Date.now()}/${crypto.randomUUID()}`;
  console.info("[email-test] sending");

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [env.EMAIL_TEST_RECIPIENT],
      subject: "Babyly e-mailtest",
      text: "Dit is een testmail van Babyly. De Resend-integratie werkt.",
      html: "<p>Dit is een testmail van Babyly.</p><p>De Resend-integratie werkt.</p>",
    }, { idempotencyKey });

    if (result.error || !result.data?.id) {
      console.error("[email-test] provider_failed");
      throw new Error("Testmail kon niet worden verstuurd.");
    }

    console.info("[email-test] sent", { messageId: result.data.id });
    return result.data.id;
  } catch {
    console.error("[email-test] provider_failed");
    throw new Error("Testmail kon niet worden verstuurd.");
  }
}
