import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";
import { submitPredictionAction } from "@/app/deelnemen/actions";
import { getCsrfToken } from "@/lib/csrf";
import { getEnv } from "@/lib/env";

export default async function PredictionFormPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error as string | undefined;

  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const env = getEnv();
  const deadlineDate = new Date(env.PREDICTION_DEADLINE_DATE);
  const isDeadlinePassed = new Date() > deadlineDate;

  const prediction = await prisma.prediction.findUnique({
    where: { participantId: session.sub },
    select: {
      predictedName: true,
      gender: true,
      weightGrams: true,
      heightCm: true,
      predictedBirthAt: true,
    },
  });
  const defaultPredictedName = prediction?.predictedName?.trim() || "";
  const defaultBirthDate = prediction
    ? `${prediction.predictedBirthAt.getFullYear()}-${String(prediction.predictedBirthAt.getMonth() + 1).padStart(2, "0")}-${String(prediction.predictedBirthAt.getDate()).padStart(2, "0")}`
    : "";
  const defaultBirthTime = prediction
    ? `${String(prediction.predictedBirthAt.getHours()).padStart(2, "0")}:${String(prediction.predictedBirthAt.getMinutes()).padStart(2, "0")}`
    : "";
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🎈</span>
          <div>
            <p className="baby-tag text-[0.62rem]">verrassing</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Wat denk jij?</h1>
        <p className="mt-3 text-[#3c594b]">Je kunt je voorspelling aanpassen tot {deadlineDate.toLocaleDateString("nl-NL")}.</p>

        {error === "ongeldig" && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            Er is een beveiligingsprobleem opgetreden. Probeer het opnieuw.
          </div>
        )}
        {error === "validatie" && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            Controleer of alle velden juist zijn ingevuld.
          </div>
        )}
        {error === "datumtijd" && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            De datum en tijd zijn ongeldig. Controleer alstublieft.
          </div>
        )}
        {error === "verlopen" && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            Helaas is de deadline voor voorspellingen verstreken ({deadlineDate.toLocaleDateString("nl-NL")}).
          </div>
        )}

        {isDeadlinePassed ? (
          <div className="mt-8 rounded-lg bg-yellow-100 p-4 text-yellow-800">
            <p className="font-bold">Voorspellingen zijn gesloten</p>
            <p className="mt-1">De deadline voor voorspellingen is verstreken op {deadlineDate.toLocaleDateString("nl-NL")}.</p>
          </div>
        ) : (
          <form action={submitPredictionAction} className="mt-8 space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokte naam</span>
            <input required name="name" defaultValue={defaultPredictedName} className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokt geslacht</span>
            <select required name="gender" defaultValue={prediction?.gender ?? ""} className="baby-input">
              <option value="">Kies...</option>
              <option value="boy">Jongen ♂</option>
              <option value="girl">Meisje ♀</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokt gewicht (kg)</span>
            <input required step="0.01" min="0.5" max="10" type="number" name="weightKg" defaultValue={prediction ? prediction.weightGrams / 1000 : ""} className="baby-input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Gegokte lengte (cm)</span>
            <input required min="20" max="80" type="number" name="heightCm" defaultValue={prediction?.heightCm ?? ""} className="baby-input" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Verwachte geboortedatum</span>
              <input required type="date" name="birthDate" defaultValue={defaultBirthDate} className="baby-input" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Verwacht tijdstip</span>
              <input required type="time" name="birthTime" defaultValue={defaultBirthTime} className="baby-input" />
            </label>
          </div>

          <button type="submit" className="baby-button-primary w-full px-4 py-3 text-base">
            💚 Mijn voorspelling opslaan
          </button>
        </form>
        )}

        <aside className="mt-8 rounded-2xl border border-[#f4d88b] bg-[#fff8df] p-4 text-[#5f4d1a]">
          Ook je adres achterlaten voor het geboortekaartje? Dat kan <a className="font-bold underline" href="/deelnemen/adres/formulier">hier</a>
        </aside>
      </div>
    </main>
  );
}
