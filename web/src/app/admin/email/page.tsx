import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EmailSubNav } from "@/components/admin/EmailSubNav";
import { SendEmailForm } from "@/components/admin/SendEmailForm";
import { getCsrfToken } from "@/lib/csrf";
import { loadPickerParticipants } from "@/lib/custom-email-data";
import { prisma } from "@/lib/db";
import { SENDABLE_SYSTEM_KEYS, TEMPLATE_DEFS, isTemplateKey } from "@/lib/email-template-defs";
import { readAdminSession } from "@/lib/session";

type AdminEmailProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const okBox = "mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]";
const errBox = "mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]";

const SYSTEM_NOTES: Record<string, string> = {
  address_reminder:
    "Elke ontvanger krijgt een persoonlijke link naar het adresformulier. Alleen deelnemers met een voorspelling en zonder adres, die de afgelopen 7 dagen geen herinnering kregen, worden aangeschreven; anderen worden overgeslagen.",
  guest_magic_link: "Elke ontvanger krijgt een nieuwe persoonlijke inloglink.",
};

export default async function AdminEmailPage({ searchParams }: AdminEmailProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const requested = typeof params.sjabloon === "string" ? params.sjabloon : "";

  const customEmails = await prisma.customEmail.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const groups = [
    { label: "Eigen sjablonen", options: customEmails.map((mail) => ({ value: mail.id, label: mail.name })) },
    {
      label: "Systeemmails",
      options: SENDABLE_SYSTEM_KEYS.map((key) => ({ value: key, label: TEMPLATE_DEFS[key].label })),
    },
  ];

  let selected = "";
  let template: { subject: string; html: string; note: string | null; isSystem: boolean } | null = null;

  if (isTemplateKey(requested) && (SENDABLE_SYSTEM_KEYS as readonly string[]).includes(requested)) {
    const stored = await prisma.emailTemplate.findUnique({ where: { key: requested } });
    selected = requested;
    template = {
      subject: stored?.subject ?? TEMPLATE_DEFS[requested].subject,
      html: stored?.html ?? TEMPLATE_DEFS[requested].html,
      note: SYSTEM_NOTES[requested] ?? null,
      isSystem: true,
    };
  } else if (requested) {
    const custom = await prisma.customEmail.findUnique({ where: { id: requested } });
    if (custom) {
      selected = custom.id;
      template = { subject: custom.subject, html: custom.html, note: null, isSystem: false };
    }
  }

  const participants = template ? await loadPickerParticipants() : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">✉️</span>
          <p className="baby-tag text-[0.62rem]">e-mail</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">E-mail versturen</h1>
        <AdminTabs active="email" />
        <EmailSubNav active="versturen" />

        {typeof params.sent === "string" && (
          <p className={okBox}>
            Verstuurd: {Number(params.sent) || 0}
            {Number(params.skipped) > 0 ? `, overgeslagen: ${Number(params.skipped)}` : ""}
            {Number(params.failed) > 0 ? `, mislukt: ${Number(params.failed)}` : ""}.
          </p>
        )}
        {params.error === "ongeldig" && <p className={errBox}>Ongeldig verzoek. Probeer het opnieuw.</p>}

        <SendEmailForm
          key={selected}
          csrfToken={csrfToken}
          groups={groups}
          selected={selected}
          template={template}
          participants={participants}
        />
      </div>
    </main>
  );
}
