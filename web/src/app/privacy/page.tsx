import type { Metadata } from "next";
import { getEnv } from "@/lib/env";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Privacy | Babyly",
  description: "Privacyinformatie en het proces om gegevens te laten verwijderen.",
};

export default function PrivacyPage() {
  const { PRIVACY_CONTACT_EMAIL: contactEmail } = getEnv();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <article className="baby-card p-6 sm:p-10">
        <BackButton />
        <p className="baby-tag text-[0.62rem]">privacy</p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#234a37]">Privacy bij Babyly</h1>
        <p className="mt-4 text-[#3c594b]">
          Deze pagina legt in gewone taal uit welke gegevens Babyly verwerkt en hoe je om verwijdering kunt vragen.
        </p>

        <section className="mt-8 space-y-3 text-[#3c594b]">
          <h2 className="text-xl font-extrabold text-[#234a37]">Welke gegevens verzamelen we?</h2>
          <p>Voor deelname verwerken we je naam en e-mailadres.</p>
          <p>Als je meedoet aan de voorspelling verwerken we je voorspelling, waaronder geslacht, gewicht, lengte en verwacht geboortemoment.</p>
          <p>Als je een geboortekaartje wilt ontvangen verwerken we je naam, straat, huisnummer, postcode, woonplaats en land.</p>
        </section>

        <section className="mt-8 space-y-3 text-[#3c594b]">
          <h2 className="text-xl font-extrabold text-[#234a37]">Waarom gebruiken we deze gegevens?</h2>
          <p>We gebruiken ze uitsluitend om de babyvoorspelling te beheren en een geboortekaartje te kunnen versturen.</p>
          <p>Gegevens zijn niet publiek zichtbaar en worden niet gebruikt voor advertenties, tracking of verkoop aan derden.</p>
        </section>

        <section className="mt-8 space-y-3 text-[#3c594b]">
          <h2 className="text-xl font-extrabold text-[#234a37]">Wie heeft toegang?</h2>
          <p>De beheerder van Babyly heeft toegang tot deelnemergegevens voor het beheer van de inzendingen en verzending van geboortekaartjes.</p>
          <p>Hosting-, database- en e-maildienstverleners kunnen gegevens technisch verwerken om de dienst te laten werken. Zij krijgen alleen toegang voor die dienstverlening en worden vóór productie geselecteerd op privacy en beveiliging.</p>
          <p>Deelnemers kunnen alleen hun eigen beveiligde flow gebruiken. Voorspellingen en adressen zijn niet openbaar.</p>
        </section>

        <section className="mt-8 space-y-3 text-[#3c594b]">
          <h2 className="text-xl font-extrabold text-[#234a37]">Bewaren en verwijderen</h2>
          <p>De beoogde bewaartermijn voor deelnemergegevens is maximaal één jaar, tenzij verwijdering eerder wordt gevraagd of een wettelijke verplichting anders bepaalt.</p>
          <p>We verwijderen of maken authenticatietokens onbruikbaar zodra ze niet meer nodig zijn. Backups vallen onder een afzonderlijk herstel- en bewaarbeleid.</p>
        </section>

        <section className="mt-8 space-y-3 text-[#3c594b]">
          <h2 className="text-xl font-extrabold text-[#234a37]">Verwijdering aanvragen</h2>
          <p>
            Stuur een verzoek naar <a className="font-bold underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> vanaf het e-mailadres waarmee je hebt deelgenomen.
          </p>
          <p>De beheerder controleert het verzoek, zoekt de bijbehorende deelnemer op en verwijdert alle gekoppelde voorspellingen en adresgegevens via de beveiligde adminomgeving. Je ontvangt daarna bevestiging.</p>
          <p>Vraag je verwijdering voor iemand anders aan, vermeld dan waarom je daartoe bevoegd bent. Deel geen toegangscodes of magic links per e-mail.</p>
        </section>

        <p className="mt-10 border-t border-[#dcebd8] pt-4 text-sm text-[#4f6a5d]">
          Deze informatie is een praktische privacyuitleg en geen vervanging voor juridisch advies.
        </p>
      </article>
    </main>
  );
}