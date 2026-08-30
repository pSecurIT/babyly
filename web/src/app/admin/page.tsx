import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import { deleteParticipantAction, purgeAllAction, resetPredictionAction } from "@/app/admin/actions";
import { getCsrfToken } from "@/lib/csrf";

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

  const [participantCount, predictions, boyCount, girlCount] = await Promise.all([
    prisma.participant.count(),
    prisma.prediction.findMany({
      include: { participant: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.prediction.count({ where: { gender: "boy" } }),
    prisma.prediction.count({ where: { gender: "girl" } }),
  ]);

  const predictionCount = predictions.length;
  const boyPercentage = predictionCount > 0 ? Math.round((boyCount / predictionCount) * 100) : 0;
  const girlPercentage = predictionCount > 0 ? Math.round((girlCount / predictionCount) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🔐</span>
          <p className="baby-tag text-[0.62rem]">admin</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Admin dashboard</h1>

        {params.deleted === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Deelnemer verwijderd.
          </p>
        )}
        {params.reset === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Voorspelling gereset.
          </p>
        )}
        {params.purged === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Alle deelnemergegevens zijn gepurged.
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
            <p className="text-sm text-[#4f6a5d]">Jongen / Meisje</p>
            <p className="text-2xl font-extrabold text-[#234a37]">
              {boyPercentage}% / {girlPercentage}%
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/admin/adressen" className="baby-button-secondary px-4 py-2 text-sm">
            📮 Ingevulde adressen
          </a>
          <a href="/api/admin/export" className="baby-button-secondary px-4 py-2 text-sm">
            ⬇️ CSV-export
          </a>
          <form action={purgeAllAction}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <button
              type="submit"
              className="rounded-full border border-[#e2a4a4] bg-[#fdeeee] px-4 py-2 text-sm font-bold text-[#7a2b2b]"
            >
              🗑️ Alles purgen
            </button>
          </form>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#cfecc7] text-left text-[#4f6a5d]">
                <th className="py-2 pr-4">Deelnemer</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Gegokte naam</th>
                <th className="py-2 pr-4">Geslacht</th>
                <th className="py-2 pr-4">Gewicht</th>
                <th className="py-2 pr-4">Lengte</th>
                <th className="py-2 pr-4">Geboortemoment</th>
                <th className="py-2 pr-4">Wijzigingen</th>
                <th className="py-2 pr-4">Acties</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((prediction) => (
                <tr key={prediction.id} className="border-b border-[#ebf5e8]">
                  <td className="py-2 pr-4">{prediction.participant?.name ?? "-"}</td>
                  <td className="py-2 pr-4">{prediction.participant?.email ?? "-"}</td>
                  <td className="py-2 pr-4">{prediction.predictedName}</td>
                  <td className="py-2 pr-4">{prediction.gender === "boy" ? "Jongen" : "Meisje"}</td>
                  <td className="py-2 pr-4">{(prediction.weightGrams / 1000).toFixed(2)} kg</td>
                  <td className="py-2 pr-4">{prediction.heightCm} cm</td>
                  <td className="py-2 pr-4">{prediction.predictedBirthAt.toLocaleString("nl-NL")}</td>
                  <td className="py-2 pr-4">{prediction.editCount}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <form action={resetPredictionAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="participantId" value={prediction.participantId} />
                        <button type="submit" className="text-xs font-bold text-[#4a9d61] underline">
                          Reset
                        </button>
                      </form>
                      <form action={deleteParticipantAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="participantId" value={prediction.participantId} />
                        <button type="submit" className="text-xs font-bold text-[#a03d3d] underline">
                          Verwijder
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-[#4f6a5d]">
                    Nog geen voorspellingen.
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
