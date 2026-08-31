import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";
import { getEnv } from "@/lib/env";
import { BackButton } from "@/components/BackButton";

export default async function PredictionThanksPage() {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const env = getEnv();
  const deadlineDate = new Date(env.PREDICTION_DEADLINE_DATE);
  const isDeadlinePassed = new Date() > deadlineDate;

  const prediction = await prisma.prediction.findUnique({
    where: { participantId: session.sub },
  });

  if (!prediction) {
    redirect("/deelnemen/voorspelling/formulier");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🎉</span>
          <div>
            <p className="baby-tag text-[0.62rem]">bedankt</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Bedankt voor je voorspelling!</h1>
        <p className="mt-3 text-[#3c594b]">
          We hebben je voorspelling opgeslagen. {!isDeadlinePassed && `Je kunt hem nog aanpassen tot ${deadlineDate.toLocaleDateString("nl-NL")}.`}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {!isDeadlinePassed && (
            <a href="/deelnemen/voorspelling/formulier" className="baby-button-secondary px-6 py-5 text-lg">
              ✏️ Voorspelling wijzigen
            </a>
          )}
          <a href="/deelnemen/adres/formulier" className="baby-button-primary px-6 py-5 text-lg">
            🏡 Mijn adres toevoegen
          </a>
        </div>
      </div>
    </main>
  );
}
