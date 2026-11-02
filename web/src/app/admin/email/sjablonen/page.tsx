import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteCustomEmailAction } from "@/app/admin/email/actions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { EmailSubNav } from "@/components/admin/EmailSubNav";
import { TemplatePicker } from "@/components/admin/TemplatePicker";
import { getCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { TEMPLATE_DEFS, TEMPLATE_KEYS } from "@/lib/email-template-defs";
import { readAdminSession } from "@/lib/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const okBox = "mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]";
const errBox = "mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]";

export default async function EmailTemplatesPage({ searchParams }: PageProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const [customEmails, stored] = await Promise.all([
    prisma.customEmail.findMany({
      select: {
        id: true,
        name: true,
        sends: { select: { sentAt: true }, orderBy: { sentAt: "desc" }, take: 1 },
        _count: { select: { sends: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.emailTemplate.findMany({ select: { key: true, updatedAt: true } }),
  ]);
  const updatedAtByKey = new Map(stored.map((template) => [template.key, template.updatedAt]));
  const customOptions = customEmails.map((mail) => ({ value: mail.id, label: mail.name }));
  const systemOptions = TEMPLATE_KEYS.map((key) => ({ value: key, label: TEMPLATE_DEFS[key].label }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <h1 className="mt-4 text-3xl font-extrabold text-[#234a37]">E-mailsjablonen</h1>
        <AdminTabs active="email" />
        <EmailSubNav active="sjablonen" />

        {params.deletedMail === "1" && <p className={okBox}>Sjabloon verwijderd.</p>}
        {params.error === "ongeldig" && <p className={errBox}>Ongeldig verzoek. Probeer het opnieuw.</p>}

        <section className="mt-6 rounded-2xl border border-[#cfecc7] p-5">
          <h2 className="text-xl font-extrabold text-[#234a37]">Nieuw sjabloon</h2>
          <p className="mt-1 text-sm text-[#4f6a5d]">Begin leeg, of kopieer een bestaand sjabloon en pas het aan.</p>
          <div className="mt-3">
            <TemplatePicker
              label="Kopieer van"
              placeholder="Leeg sjabloon"
              buttonLabel="Nieuw sjabloon maken"
              groups={[
                { label: "Eigen sjablonen", options: customOptions },
                { label: "Systeemmails", options: systemOptions },
              ]}
              hrefTemplate="/admin/email/nieuw?van={value}"
              allowEmpty
              emptyHref="/admin/email/nieuw"
              primary
            />
          </div>
        </section>

        <h2 className="mt-8 text-xl font-extrabold text-[#234a37]">Eigen sjablonen</h2>
        <ul className="mt-3 space-y-2">
          {customEmails.map((mail) => (
            <li key={mail.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfecc7] p-3 text-sm">
              <span className="font-semibold text-[#234a37]">{mail.name}</span>
              <span className="text-[#4f6a5d]">
                {mail._count.sends === 0
                  ? "Nog niet verstuurd"
                  : `${mail._count.sends}× verstuurd, laatst op ${mail.sends[0].sentAt.toLocaleString("nl-NL")}`}
              </span>
              <span className="flex items-center gap-2">
                <Link href={`/admin/email/bericht/${mail.id}`} className="baby-button-secondary px-3 py-1 text-xs">
                  Bewerken
                </Link>
                <form action={deleteCustomEmailAction}>
                  <input type="hidden" name="csrfToken" value={csrfToken} />
                  <input type="hidden" name="id" value={mail.id} />
                  <ConfirmSubmitButton
                    message={`Sjabloon "${mail.name}" en de verzendgeschiedenis definitief verwijderen?`}
                    className="baby-button-secondary px-3 py-1 text-xs"
                  >
                    Verwijderen
                  </ConfirmSubmitButton>
                </form>
              </span>
            </li>
          ))}
          {customEmails.length === 0 && <li className="text-sm text-[#4f6a5d]">Nog geen eigen sjablonen.</li>}
        </ul>

        <h2 className="mt-8 text-xl font-extrabold text-[#234a37]">Systeemmails</h2>
        <p className="mt-1 text-sm text-[#4f6a5d]">
          Een aangepaste systeemmail vervangt de standaardtekst; bij een fout wordt automatisch de standaardtekst gebruikt.
        </p>
        <ul className="mt-3 space-y-2">
          {TEMPLATE_KEYS.map((key) => {
            const updatedAt = updatedAtByKey.get(key);
            return (
              <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfecc7] p-3 text-sm">
                <span>
                  <span className="font-semibold text-[#234a37]">{TEMPLATE_DEFS[key].label}</span>
                  <span className="block text-xs text-[#4f6a5d]">{TEMPLATE_DEFS[key].description}</span>
                  <span className="block text-xs text-[#4f6a5d]">
                    {updatedAt ? `Aangepast op ${updatedAt.toLocaleString("nl-NL")}` : "Standaardtekst"}
                  </span>
                </span>
                <Link href={`/admin/email/sjablonen/${key}`} className="baby-button-secondary px-3 py-1 text-xs">
                  Bewerken
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
