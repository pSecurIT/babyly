type AdminLoginProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

import { getCsrfToken } from "@/lib/csrf";

export default async function AdminLoginPage({ searchParams }: AdminLoginProps) {
  const params = await searchParams;
  const showMailSent = params.mail === "1";
  const showAuthFailed = params.auth === "failed";
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <div className="baby-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="baby-emoji text-xl" aria-hidden="true">🔐</span>
          <p className="baby-tag text-[0.62rem]">admin</p>
        </div>

        <h1 className="text-2xl font-extrabold text-[#234a37]">Adminlogin</h1>
        <p className="mt-3 text-[#3c594b]">
          Vul je toegewezen e-mailadres in. Als het bekend is, sturen we een eenmalige inloglink.
        </p>

        {showMailSent && (
          <p className="mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]">
            Check je mailbox: als het e-mailadres bekend is, sturen we een eenmalige link.
          </p>
        )}

        {showAuthFailed && (
          <p className="mt-4 rounded-2xl border border-[#f0b4b4] bg-[#fdeeee] p-4 text-[#7a2b2b]">
            Deze link is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
          </p>
        )}

        <form action="/api/auth/admin-request-link" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#2b4a3a]">E-mailadres</span>
            <input required type="email" name="email" className="baby-input" />
          </label>

          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <button type="submit" className="baby-button-primary w-full px-4 py-3 text-base">
            ✨ Stuur mij de link
          </button>
        </form>
      </div>
    </main>
  );
}
