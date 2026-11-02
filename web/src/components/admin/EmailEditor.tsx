"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { EditorState } from "@/app/admin/email/actions";
import { PLACEHOLDER_INFO, SAMPLE_VALUES, fillPlaceholders, type PlaceholderName } from "@/lib/email-template-defs";

type EmailEditorProps = {
  mode: "template" | "custom";
  action: (state: EditorState, formData: FormData) => Promise<EditorState>;
  csrfToken: string;
  hiddenFields: Record<string, string>;
  initialName?: string;
  // Present when editing a saved custom template; enables "save as new".
  canSaveAsNew?: boolean;
  initialSubject: string;
  initialHtml: string;
  placeholders: PlaceholderName[];
  required: PlaceholderName[];
  children?: ReactNode;
};

const inputClass = "mt-1 w-full rounded-xl border border-[#cfecc7] bg-white px-3 py-2 text-sm text-[#234a37]";

export function EmailEditor(props: EmailEditorProps) {
  const [state, formAction, pending] = useActionState<EditorState, FormData>(props.action, {
    errors: [],
    message: null,
  });
  const [subject, setSubject] = useState(props.initialSubject);
  const [html, setHtml] = useState(props.initialHtml);
  const [name, setName] = useState(props.initialName ?? "");
  const isCustom = props.mode === "custom";

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="csrfToken" value={props.csrfToken} />
      {Object.entries(props.hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {state.errors.length > 0 && (
        <ul className="list-disc rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 pl-8 text-[#7a2b2b]" role="alert">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {state.message && (
        <p className="rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]" role="status">
          {state.message}
        </p>
      )}

      {isCustom && (
        <label className="block text-sm font-semibold text-[#234a37]">
          Interne naam
          <input type="text" name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </label>
      )}

      <label className="block text-sm font-semibold text-[#234a37]">
        Onderwerp
        <input
          type="text"
          name="subject"
          required
          maxLength={200}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-[#234a37]">
          HTML-inhoud
          <textarea
            name="html"
            required
            rows={22}
            spellCheck={false}
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            className={`${inputClass} font-mono text-xs`}
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-[#234a37]">Voorbeeld (met voorbeeldgegevens)</p>
          <p className="mt-1 truncate text-xs text-[#4f6a5d]">
            Onderwerp: {fillPlaceholders(subject, SAMPLE_VALUES, "text")}
          </p>
          <iframe
            title="Voorbeeld van de e-mail"
            sandbox=""
            srcDoc={fillPlaceholders(html, SAMPLE_VALUES, "html")}
            className="mt-1 h-[34rem] w-full rounded-xl border border-[#cfecc7] bg-white"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#cfecc7] bg-[#f6fcf4] p-4 text-sm text-[#234a37]">
        <p className="font-semibold">Plaatsaanduidingen</p>
        {props.placeholders.length === 0 ? (
          <p className="mt-1 text-[#4f6a5d]">Geen; dit sjabloon heeft vaste tekst.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {props.placeholders.map((name) => (
              <li key={name}>
                <code>{`{{${name}}}`}</code> - {PLACEHOLDER_INFO[name]}
                {props.required.includes(name) ? " (verplicht in de HTML)" : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[#4f6a5d]">
          De tekstversie wordt automatisch uit de HTML gemaakt. Scripts, formulieren en onveilige links worden verwijderd.
        </p>
      </div>

      {props.children}

      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="save" disabled={pending} className="baby-button-primary px-4 py-2 text-sm">
          {isCustom ? "Sjabloon opslaan" : "Opslaan"}
        </button>
        {isCustom && props.canSaveAsNew && (
          <button type="submit" name="intent" value="save_copy" disabled={pending} className="baby-button-secondary px-4 py-2 text-sm">
            Opslaan als nieuw sjabloon
          </button>
        )}
        <button type="submit" name="intent" value="test" disabled={pending} className="baby-button-secondary px-4 py-2 text-sm">
          Testmail naar mezelf
        </button>
        {!isCustom && (
          <button
            type="submit"
            name="intent"
            value="reset"
            formNoValidate
            disabled={pending}
            onClick={(event) => {
              if (!window.confirm("Weet je zeker dat je de standaardtekst wilt herstellen? Je aanpassingen gaan verloren.")) {
                event.preventDefault();
              }
            }}
            className="baby-button-secondary px-4 py-2 text-sm"
          >
            Standaardtekst herstellen
          </button>
        )}
      </div>
    </form>
  );
}
