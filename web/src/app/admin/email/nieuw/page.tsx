import { redirect } from "next/navigation";
import { saveCustomEmailAction } from "@/app/admin/email/actions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EmailEditor } from "@/components/admin/EmailEditor";
import { EmailSubNav } from "@/components/admin/EmailSubNav";
import { getCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { CUSTOM_EMAIL_PLACEHOLDERS, TEMPLATE_DEFS, isTemplateKey } from "@/lib/email-template-defs";
import { readAdminSession } from "@/lib/session";

const STARTER_HTML = `<html lang="nl">
  <body style="margin:0;background:#f3fbf1;color:#244a37;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
        <tr>
          <td style="padding:36px 32px;border:2px solid #cfecc7;border-radius:28px;background:#ffffff;">
            <h1 style="margin:0;text-align:center;color:#234a37;font-size:28px;line-height:1.2;">Titel</h1>
            <p style="margin:20px 0 0;color:#3c594b;font-size:17px;line-height:1.6;">{{greeting}}</p>
            <p style="margin:12px 0 0;color:#3c594b;font-size:17px;line-height:1.6;">Schrijf hier je bericht.</p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

export default async function NewCustomEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const query = await searchParams;
  const source = typeof query.van === "string" ? query.van : "";
  let name = "";
  let subject = "";
  let html = STARTER_HTML;

  if (isTemplateKey(source)) {
    const stored = await prisma.emailTemplate.findUnique({ where: { key: source } });
    name = `Kopie van ${TEMPLATE_DEFS[source].label}`;
    subject = stored?.subject ?? TEMPLATE_DEFS[source].subject;
    html = stored?.html ?? TEMPLATE_DEFS[source].html;
  } else if (source) {
    const custom = await prisma.customEmail.findUnique({ where: { id: source } });
    if (custom) {
      name = `Kopie van ${custom.name}`;
      subject = custom.subject;
      html = custom.html;
    }
  }

  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <h1 className="mt-4 text-3xl font-extrabold text-[#234a37]">Nieuw sjabloon</h1>
        <AdminTabs active="email" />
        <EmailSubNav active="sjablonen" />

        {html.includes("{{link}}") && (
          <p className="mt-4 rounded-2xl border border-[#f8d88b] bg-[#fff8df] p-4 text-[#5f4d1a]">
            Dit voorbeeld bevat <code>{"{{link}}"}</code>. Dat is in eigen sjablonen niet beschikbaar; verwijder het voor je opslaat.
          </p>
        )}

        <EmailEditor
          key={source}
          mode="custom"
          action={saveCustomEmailAction}
          csrfToken={csrfToken}
          hiddenFields={{}}
          initialName={name}
          initialSubject={subject}
          initialHtml={html}
          placeholders={CUSTOM_EMAIL_PLACEHOLDERS}
          required={[]}
        />
      </div>
    </main>
  );
}
