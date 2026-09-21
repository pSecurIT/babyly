import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import { purgeAllAction } from "@/app/admin/actions";
import { getCsrfToken } from "@/lib/csrf";
import { BackButton } from "@/components/BackButton";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfirmClearForm } from "@/components/admin/ConfirmClearForm";
import { CLEAR_ALL_PHRASE } from "@/lib/admin-clear-phrases";
import {
  computeDateBuckets,
  computeFillRate,
  computeGenderSplit,
  computeLastNDayBuckets,
  computeNameFrequency,
  computeRangeStats,
} from "@/lib/admin-stats";
import { BarChart, GenderDonut, NameCloud, ProgressBar, RangeStatCard } from "@/components/admin/charts";

type AdminDashboardProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();

  const [participantCount, addressCount, participants, predictions] = await Promise.all([
    prisma.participant.count(),
    prisma.addressCard.count(),
    prisma.participant.findMany({ select: { createdAt: true } }),
    prisma.prediction.findMany({
      select: {
        gender: true,
        weightGrams: true,
        heightCm: true,
        predictedBirthAt: true,
        predictedName: true,
      },
    }),
  ]);

  const predictionCount = predictions.length;
  const genderSplit = computeGenderSplit(predictions);
  const weightStats = computeRangeStats(predictions.map((prediction) => prediction.weightGrams));
  const heightStats = computeRangeStats(predictions.map((prediction) => prediction.heightCm));
  const addressFillRate = computeFillRate(addressCount, participantCount);
  const signupBuckets = computeLastNDayBuckets(
    participants.map((participant) => participant.createdAt),
    14,
  );
  const birthDateBuckets = computeDateBuckets(
    predictions.map((prediction) => prediction.predictedBirthAt),
  ).map((bucket) => ({ ...bucket, label: bucket.label.slice(5) }));
  const nameFrequency = computeNameFrequency(predictions.map((prediction) => prediction.predictedName));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🔐</span>
          <p className="baby-tag text-[0.62rem]">admin</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Admin dashboard</h1>
        <AdminTabs active="overzicht" />

        {params.purged === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Alle deelnemergegevens zijn gepurged.
          </p>
        )}
        {params.error === "bevestiging" && (
          <p className="mt-4 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 text-[#7a2b2b]">
            Bevestigingstekst kwam niet overeen; er is niets gewist.
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-4">
            <p className="text-sm text-[#4f6a5d]">Deelnemers</p>
            <p className="text-2xl font-extrabold text-[#234a37]">{participantCount}</p>
          </div>
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-4">
            <p className="text-sm text-[#4f6a5d]">Voorspellingen</p>
            <p className="text-2xl font-extrabold text-[#234a37]">{predictionCount}</p>
          </div>
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-4">
            <p className="text-sm text-[#4f6a5d]">Adressen</p>
            <p className="text-2xl font-extrabold text-[#234a37]">{addressCount}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-5">
            <p className="mb-3 text-sm font-bold text-[#4f6a5d]">Geslacht verdeling</p>
            <GenderDonut boyPct={genderSplit.boyPct} girlPct={genderSplit.girlPct} />
          </div>
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-5">
            <p className="mb-3 text-sm font-bold text-[#4f6a5d]">Voorspelde geboortedata</p>
            <BarChart data={birthDateBuckets} color="#f2b6c6" />
          </div>
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-5">
            <p className="mb-3 text-sm font-bold text-[#4f6a5d]">Gewicht &amp; lengte</p>
            <div className="grid grid-cols-2 gap-4">
              <RangeStatCard
                label="Gewicht"
                unit="g"
                min={weightStats.min}
                max={weightStats.max}
                avg={weightStats.avg}
              />
              <RangeStatCard
                label="Lengte"
                unit="cm"
                min={heightStats.min}
                max={heightStats.max}
                avg={heightStats.avg}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-[#cfecc7] bg-white p-5">
            <p className="mb-3 text-sm font-bold text-[#4f6a5d]">Populairste namen</p>
            <NameCloud names={nameFrequency} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#cfecc7] bg-white p-5">
          <p className="mb-3 text-sm font-bold text-[#4f6a5d]">Aanmeldingen per dag (laatste 14 dagen)</p>
          <BarChart data={signupBuckets} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#cfecc7] bg-white p-5">
          <p className="mb-1 text-sm font-bold text-[#4f6a5d]">Adressen ingevuld</p>
          <ProgressBar percentage={addressFillRate} label={`${addressCount} van ${participantCount} deelnemers`} />
        </div>

        <div className="mt-8 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-5">
          <p className="mb-3 text-sm font-bold text-[#7a2b2b]">⚠️ Gevarenzone</p>
          <p className="mb-3 text-sm text-[#7a2b2b]">
            Verwijdert alle deelnemers, voorspellingen, adressen en magic links. Gebruik dit alleen om fris te starten
            vlak voor livegang.
          </p>
          <ConfirmClearForm
            action={purgeAllAction}
            csrfToken={csrfToken}
            phrase={CLEAR_ALL_PHRASE}
            buttonLabel="Alles purgen"
          />
        </div>
      </div>
    </main>
  );
}
