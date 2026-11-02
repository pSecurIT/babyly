import { convert } from "html-to-text";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/db";
import {
  CUSTOM_EMAIL_PLACEHOLDERS,
  TEMPLATE_DEFS,
  fillPlaceholders,
  validateTemplateContent,
  type PlaceholderName,
  type TemplateKey,
} from "@/lib/email-template-defs";

export type RenderedEmail = { subject: string; html: string; text: string };

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "html", "body", "div", "span", "p", "br", "hr", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u",
    "a", "img", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", "center", "small", "blockquote",
  ],
  allowedAttributes: {
    "*": ["style", "align", "valign", "width", "height", "role", "lang", "bgcolor", "cellpadding", "cellspacing", "border"],
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeEmailHtml(html: string): string {
  return `<!doctype html>\n${sanitizeHtml(html, SANITIZE_OPTIONS)}`;
}

export function htmlToPlainText(html: string): string {
  return convert(html, {
    wordwrap: 72,
    selectors: [
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
      { selector: "img", format: "skip" },
      { selector: "h1", options: { uppercase: false } },
      { selector: "h2", options: { uppercase: false } },
      { selector: "h3", options: { uppercase: false } },
      { selector: "h4", options: { uppercase: false } },
    ],
  });
}

export function renderEmailContent(
  subjectSource: string,
  htmlSource: string,
  values: Partial<Record<PlaceholderName, string>>,
): RenderedEmail {
  const html = sanitizeEmailHtml(fillPlaceholders(htmlSource, values, "html"));
  return {
    subject: fillPlaceholders(subjectSource, values, "text").trim(),
    html,
    text: htmlToPlainText(html),
  };
}

export async function getStoredTemplate(key: TemplateKey) {
  return prisma.emailTemplate.findUnique({ where: { key } });
}

// Falls back to the built-in default when the stored override is missing or invalid.
export async function renderTemplate(
  key: TemplateKey,
  values: Partial<Record<PlaceholderName, string>>,
): Promise<RenderedEmail> {
  const def = TEMPLATE_DEFS[key];
  let subject = def.subject;
  let html = def.html;

  try {
    const stored = await getStoredTemplate(key);
    if (
      stored &&
      validateTemplateContent({
        subject: stored.subject,
        html: stored.html,
        allowed: def.placeholders,
        required: def.required,
      }).length === 0
    ) {
      subject = stored.subject;
      html = stored.html;
    }
  } catch {
    console.error("[email-template] lookup_failed");
  }

  return renderEmailContent(subject, html, values);
}

export function validateCustomEmail(subject: string, html: string): string[] {
  return validateTemplateContent({ subject, html, allowed: CUSTOM_EMAIL_PLACEHOLDERS, required: [] });
}
