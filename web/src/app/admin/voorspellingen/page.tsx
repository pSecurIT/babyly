import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readAdminSession } from "@/lib/session";
import {
  clearPredictionsAction,
  deleteParticipantAction,
  mailPredictionsCsvAction,
  resetPredictionAction,
} from "@/app/admin/actions";
import { CLEAR_PREDICTIONS_PHRASE } from "@/lib/admin-clear-phrases";
import { getCsrfToken } from "@/lib/csrf";
import { BackButton } from "@/components/BackButton";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfirmClearForm } from "@/components/admin/ConfirmClearForm";

type AdminPredictionsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPredictionsPage({ searchParams }: AdminPredictionsProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const csrfToken = await getCsrfToken();

  const predictions = await prisma.prediction.findMany({
    select: {
      id: true,
      participantId: true,
      predictedName: true,
      gender: true,
      weightGrams: true,
      heightCm: true,
      predictedBirthAt: true,
      createdAt: true,
      updatedAt: true,
      participant: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🔮</span>
          <p className="baby-tag text-[0.62rem]">voorspellingen</p>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Voorspellingen</h1>
        <AdminTabs active="voorspellingen" />

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
        {params.cleared === "1" && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Alle voorspellingen zijn gewist.
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

        <p className="mt-6 text-[#4f6a5d]">
          {predictions.length} voorspelling{predictions.length === 1 ? "" : "en"} ingevuld.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/api/admin/export/predictions" className="baby-button-secondary px-4 py-2 text-sm">
            ⬇️ CSV-export
          </a>
          <form action={mailPredictionsCsvAction}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <button type="submit" className="baby-button-secondary px-4 py-2 text-sm">
              ✉️ Mail CSV naar admins
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4">
          <p className="mb-3 text-sm font-bold text-[#7a2b2b]">
            ⚠️ Wist alle voorspellingen (deelnemers en adressen blijven bestaan)
          </p>
          <ConfirmClearForm
            action={clearPredictionsAction}
            csrfToken={csrfToken}
            phrase={CLEAR_PREDICTIONS_PHRASE}
            buttonLabel="Voorspellingen wissen"
          />
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
                  <td colSpan={8} className="py-4 text-center text-[#4f6a5d]">
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
