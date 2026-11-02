import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { deleteCustomEmailAction, saveCustomEmailAction } from "@/app/admin/email/actions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { EmailEditor } from "@/components/admin/EmailEditor";
import { EmailSubNav } from "@/components/admin/EmailSubNav";
import { getCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { CUSTOM_EMAIL_PLACEHOLDERS } from "@/lib/email-template-defs";
import { readAdminSession } from "@/lib/session";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const okBox = "mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]";

export default async function CustomEmailPage({ params, searchParams }: PageProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const email = await prisma.customEmail.findUnique({
    where: { id },
    include: {
      sends: { orderBy: { sentAt: "desc" }, take: 20, include: { recipients: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!email) {
    notFound();
  }
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <h1 className="mt-4 text-3xl font-extrabold text-[#234a37]">{email.name}</h1>
        <AdminTabs active="email" />
        <EmailSubNav active="sjablonen" />

        {query.saved === "1" && <p className={okBox}>Sjabloon opgeslagen.</p>}

        <p className="mt-4">
          <Link href={`/admin/email?sjabloon=${email.id}`} className="baby-button-primary px-4 py-2 text-sm">
            Versturen naar deelnemers
          </Link>
        </p>

        <EmailEditor
          key={email.updatedAt.toISOString()}
          mode="custom"
          action={saveCustomEmailAction}
          csrfToken={csrfToken}
          hiddenFields={{ id: email.id }}
          canSaveAsNew
          initialName={email.name}
          initialSubject={email.subject}
          initialHtml={email.html}
          placeholders={CUSTOM_EMAIL_PLACEHOLDERS}
          required={[]}
        />

        <h2 className="mt-10 text-xl font-extrabold text-[#234a37]">Verzendgeschiedenis</h2>
        <div className="mt-3 space-y-2">
          {email.sends.map((send) => {
            const failed = send.recipients.filter((recipient) => recipient.status !== "sent").length;
            return (
              <details key={send.id} className="rounded-2xl border border-[#cfecc7] p-3 text-sm">
                <summary className="cursor-pointer text-[#234a37]">
                  {send.sentAt.toLocaleString("nl-NL")} door {send.sentBy}: {send.recipients.length - failed} verstuurd
                  {failed > 0 ? `, ${failed} mislukt` : ""}
                </summary>
                <ul className="mt-2 space-y-1 text-[#4f6a5d]">
                  {send.recipients.map((recipient) => (
                    <li key={recipient.id}>
                      {recipient.name ? `${recipient.name} - ` : ""}
                      {recipient.email}: {recipient.status === "sent" ? "verstuurd" : "mislukt"}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          {email.sends.length === 0 && <p className="text-sm text-[#4f6a5d]">Nog niet verstuurd.</p>}
        </div>

        <form action={deleteCustomEmailAction} className="mt-8">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="id" value={email.id} />
          <ConfirmSubmitButton
            message={`Sjabloon "${email.name}" en de verzendgeschiedenis definitief verwijderen?`}
            className="baby-button-secondary px-3 py-1 text-sm"
          >
            Sjabloon verwijderen
          </ConfirmSubmitButton>
        </form>
      </div>
    </main>
  );
}
