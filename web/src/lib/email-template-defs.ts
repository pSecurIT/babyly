// Client-safe: no DB or Node-only imports, so the editor preview can reuse it.

export type PlaceholderName = "link" | "name" | "email" | "greeting";

export const PLACEHOLDER_INFO: Record<PlaceholderName, string> = {
  link: "Persoonlijke eenmalige link",
  name: "Naam van de ontvanger (wordt per ontvanger ingevuld)",
  email: "E-mailadres van de ontvanger (wordt per ontvanger ingevuld)",
  greeting: "Begroeting met de naam van de ontvanger, bijvoorbeeld \"Hoi Sanne,\"; zonder naam alleen \"Hoi,\"",
};

export const TEMPLATE_KEYS = [
  "guest_magic_link",
  "admin_magic_link",
  "address_reminder",
  "csv_predictions",
  "csv_addresses",
  "test_email",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateDef = {
  key: TemplateKey;
  label: string;
  description: string;
  placeholders: PlaceholderName[];
  required: PlaceholderName[];
  subject: string;
  html: string;
};

export const SAMPLE_VALUES: Record<PlaceholderName, string> = {
  link: "https://babyly.example.com/api/auth/verify?token=voorbeeld",
  name: "[naam ontvanger]",
  email: "[e-mailadres ontvanger]",
  greeting: "Hoi [naam ontvanger],",
};

export const CUSTOM_EMAIL_PLACEHOLDERS: PlaceholderName[] = ["name", "email", "greeting"];

export const MAX_SUBJECT_LENGTH = 200;
export const MAX_HTML_LENGTH = 50_000;

const GUEST_HTML = `<html lang="nl">
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
            <h1 style="margin:0;text-align:center;color:#234a37;font-size:30px;line-height:1.2;">Klaar voor een klein Babyly-moment?</h1>
            <p style="margin:20px 0 0;text-align:center;color:#3c594b;font-size:17px;line-height:1.6;">Met deze link ga je veilig verder naar jouw Babyly-avontuur.</p>
            <div style="margin:28px 0;padding:18px 20px;border:1px solid #f8d88b;border-radius:18px;background:#fff8df;color:#5f4d1a;text-align:center;font-size:15px;line-height:1.5;">Deze link is tijdelijk geldig en kan maar één keer worden gebruikt.</div>
            <div style="text-align:center;">
              <a href="{{link}}" style="display:inline-block;padding:16px 26px;border-radius:20px;background:#67c96f;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;box-shadow:0 10px 22px rgba(84,157,100,.28);">Naar Babyly gaan →</a>
            </div>
            <p style="margin:26px 0 0;color:#6c8576;text-align:center;font-size:13px;line-height:1.5;">Werkt de knop niet? Kopieer dan deze link naar je browser:<br><span style="color:#4a9d61;word-break:break-all;">{{link}}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 16px 0;color:#6c8576;text-align:center;font-size:12px;line-height:1.5;">Met liefde gemaakt voor dit bijzondere geboortemoment 💚</td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

const ADMIN_HTML = GUEST_HTML
  .replace("Klaar voor een klein Babyly-moment?", "Je Babyly-adminlink is er")
  .replace(
    "Met deze link ga je veilig verder naar jouw Babyly-avontuur.",
    "Met deze link open je veilig de Babyly-adminomgeving.",
  )
  .replace("Naar Babyly gaan →", "Adminomgeving openen →");

const REMINDER_HTML = `<html lang="nl">
  <body style="margin:0;background:#f3fbf1;color:#244a37;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
        <tr>
          <td style="padding:36px 32px;border:2px solid #cfecc7;border-radius:28px;background:#ffffff;">
            <h1 style="margin:0;text-align:center;color:#234a37;font-size:28px;line-height:1.2;">Een kaartje voor de baby? 💌</h1>
            <p style="margin:20px 0 0;color:#3c594b;font-size:17px;line-height:1.6;">{{greeting}}</p>
            <p style="margin:12px 0 0;color:#3c594b;font-size:17px;line-height:1.6;">Bedankt voor je voorspelling! Je hebt nog geen adres achtergelaten. Vul het in, dan sturen we je een kaartje zodra de baby er is.</p>
            <div style="margin:28px 0;text-align:center;">
              <a href="{{link}}" style="display:inline-block;padding:16px 26px;border-radius:20px;background:#67c96f;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;">Adres invullen →</a>
            </div>
            <p style="margin:0;color:#6c8576;text-align:center;font-size:13px;line-height:1.5;">Deze persoonlijke link is tijdelijk geldig en kan maar één keer worden gebruikt.<br>Werkt de knop niet? Kopieer dan deze link:<br><span style="color:#4a9d61;word-break:break-all;">{{link}}</span></p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

export const TEMPLATE_DEFS: Record<TemplateKey, TemplateDef> = {
  guest_magic_link: {
    key: "guest_magic_link",
    label: "Inloglink deelnemer",
    description: "Wordt verstuurd wanneer een deelnemer een inloglink aanvraagt.",
    placeholders: ["link", "email"],
    required: ["link"],
    subject: "Je eenmalige Babyly-link",
    html: GUEST_HTML,
  },
  admin_magic_link: {
    key: "admin_magic_link",
    label: "Inloglink beheerder",
    description: "Wordt verstuurd bij een admin-inlogverzoek. Bij een fout in de sjabloon wordt de standaardtekst gebruikt.",
    placeholders: ["link", "email"],
    required: ["link"],
    subject: "Je eenmalige Babyly-adminlink",
    html: ADMIN_HTML,
  },
  address_reminder: {
    key: "address_reminder",
    label: "Adres-herinnering",
    description: "Herinnering aan deelnemers met een voorspelling maar zonder adres.",
    placeholders: ["link", "name", "email", "greeting"],
    required: ["link"],
    subject: "Laat je adres achter voor een kaartje van Babyly",
    html: REMINDER_HTML,
  },
  csv_predictions: {
    key: "csv_predictions",
    label: "Export voorspellingen",
    description: "Begeleidende tekst bij de CSV-bijlage met voorspellingen (naar de beheerders).",
    placeholders: [],
    required: [],
    subject: "Babyly voorspellingen-export",
    html: "<p>In de bijlage vind je het gevraagde CSV-bestand.</p>",
  },
  csv_addresses: {
    key: "csv_addresses",
    label: "Export adressen",
    description: "Begeleidende tekst bij de CSV-bijlage met adressen (naar de beheerders).",
    placeholders: [],
    required: [],
    subject: "Babyly adressen-export",
    html: "<p>In de bijlage vind je het gevraagde CSV-bestand.</p>",
  },
  test_email: {
    key: "test_email",
    label: "Testmail",
    description: "Testbericht om de e-mailkoppeling te controleren.",
    placeholders: [],
    required: [],
    subject: "Babyly e-mailtest",
    html: "<p>Dit is een testmail van Babyly.</p><p>De Resend-integratie werkt.</p>",
  },
};

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

// System mails that make sense to send to participants (each needs a personal link per participant).
export const SENDABLE_SYSTEM_KEYS = ["address_reminder", "guest_magic_link"] as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

export function findPlaceholders(source: string): string[] {
  return Array.from(source.matchAll(PLACEHOLDER_REGEX), (match) => match[1]);
}

export function fillPlaceholders(
  source: string,
  values: Partial<Record<PlaceholderName, string>>,
  mode: "html" | "text",
): string {
  return source.replace(PLACEHOLDER_REGEX, (_match, name: string) => {
    const value = (values as Record<string, string | undefined>)[name] ?? "";
    return mode === "html" ? escapeHtml(value) : value.replace(/[\r\n]+/g, " ");
  });
}

export function buildGreeting(name: string | null | undefined): string {
  return name ? `Hoi ${name},` : "Hoi,";
}

export function validateTemplateContent(input: {
  subject: string;
  html: string;
  allowed: PlaceholderName[];
  required: PlaceholderName[];
}): string[] {
  const errors: string[] = [];
  const subject = input.subject.trim();

  if (!subject) {
    errors.push("Onderwerp is verplicht.");
  } else if (subject.length > MAX_SUBJECT_LENGTH) {
    errors.push(`Onderwerp mag maximaal ${MAX_SUBJECT_LENGTH} tekens bevatten.`);
  }
  if (/[\r\n]/.test(input.subject)) {
    errors.push("Onderwerp mag geen regeleinden bevatten.");
  }
  if (!input.html.trim()) {
    errors.push("De HTML-inhoud is verplicht.");
  } else if (input.html.length > MAX_HTML_LENGTH) {
    errors.push(`De HTML-inhoud mag maximaal ${MAX_HTML_LENGTH} tekens bevatten.`);
  }

  const used = new Set([...findPlaceholders(input.subject), ...findPlaceholders(input.html)]);
  const unknown = Array.from(used).filter((name) => !(input.allowed as string[]).includes(name));
  if (unknown.length > 0) {
    errors.push(`Onbekende plaatsaanduiding: ${unknown.map((name) => `{{${name}}}`).join(", ")}.`);
  }
  const htmlPlaceholders = new Set(findPlaceholders(input.html));
  for (const name of input.required) {
    if (!htmlPlaceholders.has(name)) {
      errors.push(`{{${name}}} moet in de HTML-inhoud staan.`);
    }
  }

  return errors;
}
