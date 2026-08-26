import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";
import { getCsrfToken } from "@/lib/csrf";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const session = await readGuestSession();

  if (session) {
    const participant = await prisma.participant.findUnique({
      where: { id: session.sub },
      select: { name: true },
    });
    const firstName = participant?.name?.trim() || "vriend";

    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <section className="baby-card p-8 sm:p-12">
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <span className="baby-emoji text-2xl" aria-hidden="true">🌼</span>
              <p className="baby-tag">
                <span aria-hidden="true">🌱</span>
                Welkom terug
              </p>
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-[#234a37] sm:text-5xl">
              Hallo {firstName}!
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#3c594b]">
              Je bent geverifieerd. Kies hieronder een van de twee opties, je mag ze beide invullen.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <a
                href="/deelnemen/voorspelling/formulier"
                className="baby-button-primary px-6 py-5 text-lg"
              >
                ✨ Mijn voorspelling invullen
              </a>
              <a
                href="/deelnemen/adres/formulier"
                className="baby-button-secondary px-6 py-5 text-lg"
              >
                🏡 Mijn adres achterhalen
              </a>
            </div>

            <p className="mt-6 text-sm text-[#4f6a5d]">
              Privacy eerst: gegevens zijn niet publiek zichtbaar en alleen bedoeld voor dit geboortemoment.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const showMailSent = params.mail === "1";
  const showAuthRequired = params.auth === "1";
  const showAuthFailed = params.auth === "failed";
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-2xl" aria-hidden="true">🌼</span>
          <p className="baby-tag">
            <span aria-hidden="true">🌱</span>
            Welkom
          </p>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-[#234a37]">
          Wanneer komt onze kleine spruit?
        </h1>
        <p className="mt-5 text-[#3c594b]">
          Vul de geheime toegangscode en je e-mailadres in. We sturen je een eenmalige link waarmee je
          daarna kunt kiezen om je voorspelling in te vullen of je adres achter te laten.
        </p>

        {showMailSent && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Check je mailbox: als de gegevens kloppen, sturen we je een eenmalige link.
          </p>
        )}

        {showAuthRequired && (
          <p className="mt-4 rounded-2xl border border-[#f4d88b] bg-[#fff8df] p-4 text-[#5f4d1a]">
            Verifieer eerst je e-mailadres via de link voordat je verder kunt.
          </p>
        )}

        {showAuthFailed && (
          <p className="mt-4 rounded-2xl border border-[#f0b4b4] bg-[#fdeeee] p-4 text-[#7a2b2b]">
            Deze link is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
          </p>
        )}

        <form action="/api/auth/request-link" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Je naam</span>
            <input
              required
              type="text"
              name="name"
              placeholder="Bijv. Emma"
              className="baby-input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">Geheime toegangscode</span>
            <input
              required
              type="password"
              name="accessCode"
              className="baby-input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">E-mailadres</span>
            <input
              required
              type="email"
              name="email"
              className="baby-input"
            />
          </label>

          <button type="submit" className="baby-button-primary w-full px-4 py-3 text-base">
            ✨ Stuur mij de link
          </button>
        </form>

        <p className="mt-4 text-sm text-[#4f6a5d]">
          Zie je geen mail? Controleer je spamfolder. Voor privacy tonen we altijd dezelfde melding.
        </p>
      </div>
    </main>
  );
}
