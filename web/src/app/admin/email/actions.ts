"use server";

import { redirect } from "next/navigation";
import { csrfTokenFromForm, validateCsrfToken } from "@/lib/csrf";
import { MAX_RECIPIENTS, mergeRecipients, parseExtraEmails } from "@/lib/custom-email";
import { prisma } from "@/lib/db";
import { sendCustomEmail, sendTemplatePreview } from "@/lib/email";
import {
  CUSTOM_EMAIL_PLACEHOLDERS,
  SENDABLE_SYSTEM_KEYS,
  TEMPLATE_DEFS,
  isTemplateKey,
  validateTemplateContent,
} from "@/lib/email-template-defs";
import { sanitizeEmailHtml } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { sendGuestLinkTo, sendReminderTo } from "@/lib/reminders";
import { readAdminSession } from "@/lib/session";
import { safeText } from "@/lib/validation";

export type EditorState = { errors: string[]; message: string | null };

const TEN_MINUTES = 10 * 60 * 1000;

function fail(...errors: string[]): EditorState {
  return { errors, message: null };
}

function sanitizeForStorage(html: string): string {
  return sanitizeEmailHtml(html).replace(/^<!doctype html>\n/, "");
}

async function requireAdmin(formData: FormData, failurePath: string) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!(await validateCsrfToken(csrfTokenFromForm(formData)))) {
    redirect(`${failurePath}?error=ongeldig`);
  }
  return session;
}

export async function saveTemplateAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const session = await requireAdmin(formData, "/admin/email/sjablonen");

  const key = String(formData.get("key") || "");
  if (!isTemplateKey(key)) {
    redirect("/admin/email/sjablonen?error=ongeldig");
  }
  const def = TEMPLATE_DEFS[key];
  const intent = String(formData.get("intent") || "save");
  const path = `/admin/email/sjablonen/${key}`;

  if (!rateLimit(`admin-template:${session.sub}`, 30, TEN_MINUTES).allowed) {
    return fail("Te veel verzoeken; probeer het later opnieuw.");
  }

  if (intent === "reset") {
    await prisma.emailTemplate.deleteMany({ where: { key } });
    console.info("[admin-audit] email_template_reset");
    redirect(`${path}?reset=1`);
  }

  const subject = String(formData.get("subject") || "");
  const html = sanitizeForStorage(String(formData.get("html") || ""));
  const errors = validateTemplateContent({ subject, html, allowed: def.placeholders, required: def.required });
  if (errors.length > 0) {
    return fail(...errors);
  }

  if (intent === "test") {
    if (!rateLimit(`admin-template-test:${session.sub}`, 10, TEN_MINUTES).allowed) {
      return fail("Te veel testmails; probeer het later opnieuw.");
    }
    try {
      await sendTemplatePreview(key, session.sub, subject, html);
    } catch {
      return fail("Testmail kon niet worden verstuurd.");
    }
    console.info("[admin-audit] email_template_test_sent");
    return { errors: [], message: "Testmail verstuurd naar je eigen adres." };
  }

  await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, subject: subject.trim(), html, updatedBy: session.sub },
    update: { subject: subject.trim(), html, updatedBy: session.sub },
  });
  console.info("[admin-audit] email_template_saved");
  redirect(`${path}?saved=1`);
}

export async function saveCustomEmailAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const session = await requireAdmin(formData, "/admin/email/sjablonen");

  const intent = String(formData.get("intent") || "save");
  const id = String(formData.get("id") || "");
  const subject = String(formData.get("subject") || "");
  const html = sanitizeForStorage(String(formData.get("html") || ""));

  if (id) {
    const existing = await prisma.customEmail.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      redirect("/admin/email/sjablonen?error=ongeldig");
    }
  }

  const nameResult = safeText(1, 100).safeParse(formData.get("name"));
  const errors = validateTemplateContent({
    subject,
    html,
    allowed: CUSTOM_EMAIL_PLACEHOLDERS,
    required: [],
  });
  if (!nameResult.success) {
    errors.unshift("Geef het sjabloon een naam (max. 100 tekens, zonder < of >).");
  }
  if (errors.length > 0 || !nameResult.success) {
    return fail(...errors);
  }

  if (intent === "test") {
    if (!rateLimit(`admin-custom-test:${session.sub}`, 10, TEN_MINUTES).allowed) {
      return fail("Te veel testmails; probeer het later opnieuw.");
    }
    try {
      await sendTemplatePreview("custom", session.sub, subject, html);
    } catch {
      return fail("Testmail kon niet worden verstuurd.");
    }
    console.info("[admin-audit] custom_email_test_sent");
    return { errors: [], message: "Testmail verstuurd naar je eigen adres." };
  }

  const data = { name: nameResult.data, subject: subject.trim(), html };
  const saved = id && intent !== "save_copy"
    ? await prisma.customEmail.update({ where: { id }, data })
    : await prisma.customEmail.create({ data: { ...data, createdBy: session.sub } });

  console.info(`[admin-audit] custom_email_${intent === "save_copy" ? "copied" : "saved"}`);
  redirect(`/admin/email/bericht/${saved.id}?saved=1`);
}

export async function sendEmailAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const session = await requireAdmin(formData, "/admin/email");

  const template = String(formData.get("template") || "");
  if (!template) {
    return fail("Kies eerst een sjabloon.");
  }
  if (formData.get("confirm") !== "yes") {
    return fail("Bevestig eerst het versturen; er is niets verstuurd.");
  }
  const system = isTemplateKey(template);
  if (system && !(SENDABLE_SYSTEM_KEYS as readonly string[]).includes(template)) {
    return fail("Deze systeemmail kan niet naar deelnemers worden verstuurd.");
  }
  if (!rateLimit(`admin-custom-send:${session.sub}`, 3, TEN_MINUTES).allowed) {
    return fail("Te veel verzendingen; probeer het later opnieuw.");
  }

  const participantIds = Array.from(
    new Set(
      formData
        .getAll("participantId")
        .map(String)
        .filter((value) => /^[a-z0-9]{10,40}$/i.test(value)),
    ),
  ).slice(0, 1000);
  const extra = parseExtraEmails(String(formData.get("extraEmails") || ""));
  const basePath = `/admin/email?sjabloon=${encodeURIComponent(template)}`;

  if (system) {
    // Link mails need a participant record, so extra addresses cannot be used here.
    if (extra.valid.length > 0 || extra.invalid.length > 0) {
      return fail("Extra e-mailadressen zijn alleen mogelijk met eigen sjablonen.");
    }
    if (participantIds.length === 0) {
      return fail("Selecteer minstens één ontvanger.");
    }
    if (participantIds.length > MAX_RECIPIENTS) {
      return fail(`Maximaal ${MAX_RECIPIENTS} ontvangers per e-mail.`);
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    // Sequential on purpose to stay within provider rate limits.
    for (const participantId of participantIds) {
      try {
        const result = template === "address_reminder"
          ? await sendReminderTo(participantId)
          : await sendGuestLinkTo(participantId);
        if (result === "sent") sent += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    console.info(`[admin-audit] system_email_sent template=${template} sent=${sent} skipped=${skipped} failed=${failed}`);
    redirect(`${basePath}&sent=${sent}&skipped=${skipped}&failed=${failed}`);
  }

  const email = await prisma.customEmail.findUnique({ where: { id: template } });
  if (!email) {
    return fail("Dit sjabloon bestaat niet meer.");
  }
  if (extra.invalid.length > 0) {
    return fail(`Ongeldig e-mailadres: ${extra.invalid.slice(0, 5).join(", ")}`);
  }

  const participants = participantIds.length
    ? await prisma.participant.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const recipients = mergeRecipients(participants, extra.valid);
  if (recipients.length === 0) {
    return fail("Selecteer minstens één ontvanger.");
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return fail(`Maximaal ${MAX_RECIPIENTS} ontvangers per e-mail.`);
  }

  const send = await prisma.customEmailSend.create({
    data: { customEmailId: email.id, subject: email.subject, sentBy: session.sub },
  });

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    let status: "sent" | "failed" = "sent";
    try {
      await sendCustomEmail({
        to: recipient.email,
        name: recipient.name,
        subject: email.subject,
        html: email.html,
        idempotencyKey: `custom/${send.id}/${recipient.email}`,
      });
      sent += 1;
    } catch {
      status = "failed";
      failed += 1;
    }
    await prisma.customEmailRecipient.create({
      data: { sendId: send.id, email: recipient.email, name: recipient.name, status },
    });
  }

  console.info(`[admin-audit] custom_email_sent sent=${sent} failed=${failed}`);
  redirect(`${basePath}&sent=${sent}&skipped=0&failed=${failed}`);
}

export async function deleteCustomEmailAction(formData: FormData) {
  await requireAdmin(formData, "/admin/email/sjablonen");

  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/admin/email/sjablonen?error=ongeldig");
  }

  await prisma.customEmail.deleteMany({ where: { id } });
  console.info("[admin-audit] custom_email_deleted");
  redirect("/admin/email/sjablonen?deletedMail=1");
}
