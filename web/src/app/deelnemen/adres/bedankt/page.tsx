import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readGuestSession } from "@/lib/session";

export default async function AddressThanksPage() {
  const session = await readGuestSession();
  if (!session) {
    redirect("/?auth=1");
  }

  const address = await prisma.addressCard.findUnique({
    where: { participantId: session.sub },
    select: { id: true },
  });

  if (!address) {
    redirect("/deelnemen/adres/formulier");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">💌</span>
          <div>
            <p className="baby-tag text-[0.62rem]">bedankt</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#234a37]">Bedankt voor je adres!</h1>
        <p className="mt-3 text-[#3c594b]">
          We hebben je adres opgeslagen voor het geboortekaartje.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="/deelnemen/voorspelling/formulier" className="baby-button-primary px-6 py-5 text-center text-lg">
            🔮 Voorspelling invullen of aanpassen
          </a>
          <a href="/deelnemen/adres/formulier" className="baby-button-secondary px-6 py-5 text-center text-lg">
            ✏️ Mijn adres aanpassen
          </a>
        </div>
      </div>
    </main>
  );
}