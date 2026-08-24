import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";
import { submitPredictionAction } from "@/app/deelnemen/actions";

export default async function PredictionFormPage() {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    select: { name: true },
  });
  const defaultName = participant?.name?.trim() || "";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🎈</span>
          <div>
            <p className="baby-tag text-[0.62rem]">verrassing</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Wat denk jij, {defaultName || "vriend"}?</h1>
        <p className="mt-3 text-[#3c594b]">Je kunt je voorspelling eenmalig aanpassen.</p>

        <form action={submitPredictionAction} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokte naam</span>
            <input required name="name" defaultValue={defaultName} className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokt geslacht</span>
            <select required name="gender" className="baby-input">
              <option value="">Kies...</option>
              <option value="boy">Jongen ♂</option>
              <option value="girl">Meisje ♀</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokt gewicht (kg)</span>
            <input required step="0.01" min="0.5" max="10" type="number" name="weightKg" className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokte lengte (cm)</span>
            <input required min="20" max="80" type="number" name="heightCm" className="baby-input" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Verwachte geboortedatum</span>
              <input required type="date" name="birthDate" className="baby-input" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Verwacht tijdstip</span>
              <input required type="time" name="birthTime" className="baby-input" />
            </label>
          </div>

          <button type="submit" className="baby-button-primary w-full px-4 py-3 text-base">
            💚 Mijn voorspelling opslaan
          </button>
        </form>

        <aside className="mt-8 rounded-2xl border border-[#f4d88b] bg-[#fff8df] p-4 text-[#5f4d1a]">
          Ook je adres achterlaten voor het geboortekaartje? Dat kan <a className="font-bold underline" href="/deelnemen/adres/formulier">hier</a>
        </aside>
      </div>
    </main>
  );
}
