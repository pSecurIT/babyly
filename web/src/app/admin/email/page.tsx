import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/session";
import { BackButton } from "@/components/BackButton";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { sendAddressReminderAction, sendAllAddressRemindersAction } from "@/app/admin/actions";
import { getCsrfToken } from "@/lib/csrf";
import { findReminderTargets, isInCooldown } from "@/lib/reminders";

type AdminEmailProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const okBox = "mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]";
const errBox = "mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]";

export default async function AdminEmailPage({ searchParams }: AdminEmailProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const targets = await findReminderTargets();
  const eligible = targets.filter((target) => !isInCooldown(target.reminderSentAt)).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">✉️</span>
          <p className="baby-tag text-[0.62rem]">e-mail</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Adres-herinneringen</h1>
        <AdminTabs active="email" />

        {typeof params.reminded === "string" && (
          <p className={okBox}>
            Herinneringen verstuurd: {Number(params.reminded) || 0}, overgeslagen: {Number(params.skipped) || 0}
            {Number(params.failed) > 0 ? `, mislukt: ${Number(params.failed)}` : ""}.
          </p>
        )}
        {params.error === "mail" && <p className={errBox}>Herinnering kon niet worden verstuurd.</p>}
        {params.error === "limiet" && <p className={errBox}>Te veel verzoeken; probeer het later opnieuw.</p>}
        {params.error === "bevestiging" && <p className={errBox}>Bevestig eerst het versturen; er is niets verstuurd.</p>}
        {params.error === "ongeldig" && <p className={errBox}>Ongeldig verzoek. Probeer het opnieuw.</p>}

        <p className="mt-6 text-[#4f6a5d]">
          {targets.length} deelnemer{targets.length === 1 ? "" : "s"} met voorspelling maar zonder adres; {eligible} komt
          {eligible === 1 ? "" : "en"} in aanmerking voor een herinnering (max. 1 per 7 dagen).
        </p>

        <form action={sendAllAddressRemindersAction} className="mt-6 flex flex-wrap items-center gap-3">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="flex items-center gap-2 text-sm text-[#234a37]">
            <input type="checkbox" name="confirm" value="yes" required />
            Ik wil {eligible} herinnering{eligible === 1 ? "" : "en"} versturen
          </label>
          <button
            type="submit"
            disabled={eligible === 0}
            className="baby-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✉️ Herinner iedereen zonder adres
          </button>
        </form>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#cfecc7] text-left text-[#4f6a5d]">
                <th className="py-2 pr-4">Deelnemer</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Laatste herinnering</th>
                <th className="py-2 pr-4">Actie</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => {
                const cooling = isInCooldown(target.reminderSentAt);
                return (
                  <tr key={target.id} className="border-b border-[#ebf5e8]">
                    <td className="py-2 pr-4">{target.name ?? "-"}</td>
                    <td className="py-2 pr-4">{target.email}</td>
                    <td className="py-2 pr-4">{target.reminderSentAt ? target.reminderSentAt.toLocaleString("nl-NL") : "-"}</td>
                    <td className="py-2 pr-4">
                      <form action={sendAddressReminderAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="participantId" value={target.id} />
                        <button
                          type="submit"
                          disabled={cooling}
                          className="baby-button-secondary px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Herinner
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {targets.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-[#4f6a5d]">
                    Iedereen met een voorspelling heeft al een adres ingevuld.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
