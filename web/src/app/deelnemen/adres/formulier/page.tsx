import { redirect } from "next/navigation";
import { readGuestSession } from "@/lib/session";
import { submitAddressAction } from "@/app/deelnemen/actions";
import { getCsrfToken } from "@/lib/csrf";

export default async function AddressFormPage() {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">💌</span>
          <div>
            <p className="baby-tag text-[0.62rem]">kaartje</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Adres voor geboortekaartje</h1>
        <p className="mt-3 text-[#3c594b]">Laat je adres achter, dan kunnen we het kaartje opsturen.</p>

        <form action={submitAddressAction} className="mt-8 space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Naam ontvanger</span>
            <input required name="recipientName" className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Straat</span>
            <input required name="street" className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Huisnummer</span>
            <input required name="houseNumber" className="baby-input" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Postcode</span>
              <input required name="postalCode" className="baby-input" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Woonplaats</span>
              <input required name="city" className="baby-input" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Land</span>
            <input required name="country" className="baby-input" />
          </label>

          <button type="submit" className="baby-button-primary w-full px-4 py-3 text-base">
            💚 Mijn adres opslaan
          </button>
        </form>

        <aside className="mt-8 rounded-2xl border border-[#f4d88b] bg-[#fff8df] p-4 text-[#5f4d1a]">
          Ook een voorspelling invullen? Dat kan via de andere flow.
          <div className="mt-3">
            <a className="font-bold underline" href="/deelnemen/voorspelling/formulier">
              Naar voorspelflow
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
