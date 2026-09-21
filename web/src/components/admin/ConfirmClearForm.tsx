"use client";

import { useState } from "react";

export function ConfirmClearForm({
  action,
  csrfToken,
  phrase,
  buttonLabel,
}: {
  action: (formData: FormData) => void;
  csrfToken: string;
  phrase: string;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const isMatch = value === phrase;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="confirm" value={value} />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Typ "${phrase}" om te bevestigen`}
        aria-label={`Typ ${phrase} om te bevestigen`}
        className="baby-input max-w-[16rem] py-2 text-sm"
      />
      <button
        type="submit"
        disabled={!isMatch}
        className="rounded-full border border-[#e2a4a4] bg-[#fdeeee] px-4 py-2 text-sm font-bold text-[#7a2b2b] disabled:cursor-not-allowed disabled:opacity-40"
      >
        🗑️ {buttonLabel}
      </button>
    </form>
  );
}
