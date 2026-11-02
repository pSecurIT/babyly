import { Resend } from "resend";
import { adminEmailSet, getEnv } from "@/lib/env";
import { buildGreeting, SAMPLE_VALUES, type PlaceholderName, type TemplateKey } from "@/lib/email-template-defs";
import { renderEmailContent, renderTemplate, type RenderedEmail } from "@/lib/email-templates";
import { sha256Hex } from "@/lib/security";

type SendMagicLinkInput = {
  email: string;
  link: string;
  purpose: "guest" | "admin";
};

type SendCsvEmailInput = {
  template: "csv_predictions" | "csv_addresses";
  filename: string;
  csv: string;
};

export async function sendMagicLink(input: SendMagicLinkInput) {
  const env = getEnv();

  if (env.EMAIL_DELIVERY_MODE === "provider") {
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const rendered = await renderTemplate(
        input.purpose === "admin" ? "admin_magic_link" : "guest_magic_link",
        { link: input.link, email: input.email },
      );
      const result = await resend.emails.send({
        from: env.EMAIL_FROM!,
        to: [input.email],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
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

type SendAddressReminderInput = {
  participantId: string;
  email: string;
  name: string | null;
  link: string;
};

export async function sendAddressReminder(input: SendAddressReminderInput) {
  const env = getEnv();

  if (env.EMAIL_DELIVERY_MODE !== "provider") {
    console.info(`[address-reminder:local] ${input.email} -> ${input.link}`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const rendered = await renderTemplate("address_reminder", {
      link: input.link,
      email: input.email,
      name: input.name ?? "",
      greeting: buildGreeting(input.name),
    });
    const result = await resend.emails.send({
      from: env.EMAIL_FROM!,
      to: [input.email],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    }, {
      idempotencyKey: `address-reminder/${input.participantId}/${new Date().toISOString().slice(0, 10)}`,
    });

    if (result.error) {
      console.error("[email] address_reminder_rejected");
      throw new Error("Herinnering kon niet worden verstuurd.");
    }
    console.info("[email] address_reminder_sent", { messageId: result.data?.id ?? "unknown" });
  } catch {
    console.error("[email] address_reminder_failed");
    throw new Error("Herinnering kon niet worden verstuurd.");
  }
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
    const rendered = await renderTemplate("test_email", {});
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [env.EMAIL_TEST_RECIPIENT],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
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

export async function sendCsvEmail(input: SendCsvEmailInput) {
  const env = getEnv();
  const recipients = Array.from(adminEmailSet());
  if (recipients.length === 0) {
    throw new Error("Geen admin e-mailadressen geconfigureerd.");
  }

  if (env.EMAIL_DELIVERY_MODE !== "provider") {
    console.info(`[csv-email:local] ${input.filename} -> ${recipients.length} ontvanger(s)`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const idempotencyKey = `csv-email/${Date.now()}/${crypto.randomUUID()}`;

  try {
    const rendered = await renderTemplate(input.template, {});
    const result = await resend.emails.send({
      from: env.EMAIL_FROM!,
      to: recipients,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: [{ filename: input.filename, content: Buffer.from(input.csv, "utf8") }],
    }, { idempotencyKey });

    if (result.error) {
      console.error("[email] csv_export_failed");
      throw new Error("CSV-mail kon niet worden verstuurd.");
    }

    console.info("[email] csv_export_sent", { messageId: result.data?.id ?? "unknown" });
  } catch {
    console.error("[email] csv_export_failed");
    throw new Error("CSV-mail kon niet worden verstuurd.");
  }
}

type SendCustomEmailInput = {
  to: string;
  name: string | null;
  subject: string;
  html: string;
  idempotencyKey: string;
};

// Renders per recipient so {{name}}/{{email}} are filled in individually.
export async function sendCustomEmail(input: SendCustomEmailInput) {
  const values: Partial<Record<PlaceholderName, string>> = {
    name: input.name ?? "",
    email: input.to,
    greeting: buildGreeting(input.name),
  };
  const rendered = renderEmailContent(input.subject, input.html, values);
  await deliverRendered(input.to, rendered, input.idempotencyKey, "custom_email");
}

// Sends the draft with sample data so admins can check it in a real mailbox.
export async function sendTemplatePreview(key: TemplateKey | "custom", to: string, subject: string, html: string) {
  const rendered = renderEmailContent(subject, html, SAMPLE_VALUES);
  await deliverRendered(
    to,
    { ...rendered, subject: `[TEST] ${rendered.subject}` },
    `template-preview/${key}/${Date.now()}/${crypto.randomUUID()}`,
    "template_preview",
  );
}

async function deliverRendered(to: string, rendered: RenderedEmail, idempotencyKey: string, logTag: string) {
  const env = getEnv();
  if (env.EMAIL_DELIVERY_MODE !== "provider") {
    console.info(`[${logTag}:local] ${rendered.subject}`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM!,
      to: [to],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    }, { idempotencyKey });

    if (result.error) {
      console.error(`[email] ${logTag}_rejected`);
      throw new Error("E-mail kon niet worden verstuurd.");
    }
    console.info(`[email] ${logTag}_sent`, { messageId: result.data?.id ?? "unknown" });
  } catch {
    console.error(`[email] ${logTag}_failed`);
    throw new Error("E-mail kon niet worden verstuurd.");
  }
}
