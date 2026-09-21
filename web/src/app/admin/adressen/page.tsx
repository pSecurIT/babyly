import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import { BackButton } from "@/components/BackButton";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfirmClearForm } from "@/components/admin/ConfirmClearForm";
import { CLEAR_ADDRESSES_PHRASE } from "@/lib/admin-clear-phrases";
import { clearAddressesAction, mailAddressesCsvAction } from "@/app/admin/actions";
import { getCsrfToken } from "@/lib/csrf";

type AdminAddressesProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAddressesPage({ searchParams }: AdminAddressesProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();

  const addresses = await prisma.addressCard.findMany({
    include: { participant: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">📮</span>
          <p className="baby-tag text-[0.62rem]">adressen</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Ingevulde adressen</h1>
        <AdminTabs active="adressen" />

        {params.cleared === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Alle adressen zijn gewist.
          </p>
        )}
        {params.mailed === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            CSV-export is gemaild naar de admin-adressen.
          </p>
        )}
        {params.error === "mail" && (
          <p className="mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]">
            CSV-mail kon niet worden verstuurd.
          </p>
        )}
        {params.error === "bevestiging" && (
          <p className="mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]">
            Bevestigingstekst kwam niet overeen; er is niets gewist.
          </p>
        )}

        <p className="mt-6 text-[#4f6a5d]">{addresses.length} adres{addresses.length === 1 ? "" : "sen"} ingevuld.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/api/admin/export/addresses" className="baby-button-secondary px-4 py-2 text-sm">
            ⬇️ CSV-export
          </a>
          <form action={mailAddressesCsvAction}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <button type="submit" className="baby-button-secondary px-4 py-2 text-sm">
              ✉️ Mail CSV naar admins
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4">
          <p className="mb-3 text-sm font-bold text-[#7a2b2b]">
            ⚠️ Wist alle adressen (deelnemers en voorspellingen blijven bestaan)
          </p>
          <ConfirmClearForm
            action={clearAddressesAction}
            csrfToken={csrfToken}
            phrase={CLEAR_ADDRESSES_PHRASE}
            buttonLabel="Adressen wissen"
          />
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#cfecc7] text-left text-[#4f6a5d]">
                <th className="py-2 pr-4">Naam ontvanger</th>
                <th className="py-2 pr-4">Adres</th>
                <th className="py-2 pr-4">Postcode</th>
                <th className="py-2 pr-4">Woonplaats</th>
                <th className="py-2 pr-4">Land</th>
                <th className="py-2 pr-4">Deelnemer</th>
                <th className="py-2 pr-4">Ingevuld op</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((address) => (
                <tr key={address.id} className="border-b border-[#ebf5e8]">
                  <td className="py-2 pr-4">{address.recipientName}</td>
                  <td className="py-2 pr-4">{address.street} {address.houseNumber}</td>
                  <td className="py-2 pr-4">{address.postalCode}</td>
                  <td className="py-2 pr-4">{address.city}</td>
                  <td className="py-2 pr-4">{address.country}</td>
                  <td className="py-2 pr-4">
                    <div>{address.participant?.name ?? "-"}</div>
                    <div className="text-xs text-[#4f6a5d]">{address.participant?.email ?? "-"}</div>
                  </td>
                  <td className="py-2 pr-4">{address.createdAt.toLocaleString("nl-NL")}</td>
                </tr>
              ))}
              {addresses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-[#4f6a5d]">
                    Nog geen adressen ingevuld.
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