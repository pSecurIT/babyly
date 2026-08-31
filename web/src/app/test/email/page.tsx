import { sendTestEmail } from "@/lib/email";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function EmailTestPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="baby-card p-6 sm:p-8">
          <BackButton />
          <h1 className="text-2xl font-extrabold text-[#234a37]">Niet beschikbaar</h1>
          <p className="mt-3 text-[#3c594b]">Deze lokale testpagina is niet beschikbaar in productie.</p>
        </div>
      </main>
    );
  }

  let status = "";
  try {
    const messageId = await sendTestEmail();
    status = `Testmail geaccepteerd door Resend. Message-id: ${messageId}`;
  } catch (error) {
    status = error instanceof Error ? error.message : "Testmail kon niet worden verstuurd.";
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="baby-card p-6 sm:p-8">
        <BackButton />
        <p className="baby-tag text-[0.62rem]">lokale test</p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#234a37]">E-mailtest</h1>
        <p className="mt-3 text-[#3c594b]">{status}</p>
      </div>
    </main>
  );
}