"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { sendEmailAction, type EditorState } from "@/app/admin/email/actions";
import { RecipientPicker, type PickerParticipant } from "@/components/admin/RecipientPicker";
import { SAMPLE_VALUES, buildGreeting, fillPlaceholders } from "@/lib/email-template-defs";

type Option = { value: string; label: string };

type SendEmailFormProps = {
  csrfToken: string;
  groups: { label: string; options: Option[] }[];
  selected: string;
  // Only set when a template is selected.
  template: { subject: string; html: string; note: string | null; isSystem: boolean } | null;
  participants: PickerParticipant[];
};

export function SendEmailForm({ csrfToken, groups, selected, template, participants }: SendEmailFormProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<EditorState, FormData>(
    (previous, formData) => sendEmailAction(previous, formData),
    { errors: [], message: null },
  );

  // Preview as the first selected recipient so {{name}} and {{greeting}} show a real name.
  const previewRecipient = participants.find((participant) => selectedIds.has(participant.id));
  const previewValues = previewRecipient
    ? {
        ...SAMPLE_VALUES,
        name: previewRecipient.name ?? "",
        email: previewRecipient.email,
        greeting: buildGreeting(previewRecipient.name),
      }
    : SAMPLE_VALUES;

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm font-semibold text-[#234a37]">
        Sjabloon
        <select
          value={selected}
          onChange={(event) => {
            const value = event.target.value;
            router.push(value ? `/admin/email?sjabloon=${encodeURIComponent(value)}` : "/admin/email");
          }}
          className="mt-1 block w-full max-w-md rounded-xl border border-[#cfecc7] bg-white px-3 py-2 text-sm font-normal text-[#234a37]"
        >
          <option value="">Kies een sjabloon</option>
          {groups.map((group) =>
            group.options.length === 0 ? null : (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </label>

      {template && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="template" value={selected} />

          {state.errors.length > 0 && (
            <ul className="list-disc rounded-2xl border border-[#e2a4a4] bg-[#fdeeee] p-4 pl-8 text-[#7a2b2b]" role="alert">
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          {template.note && <p className="text-sm text-[#4f6a5d]">{template.note}</p>}

          <div>
            <p className="text-sm font-semibold text-[#234a37]">Voorbeeld</p>
            <p className="mt-1 text-xs text-[#4f6a5d]">
              {previewRecipient
                ? `Getoond voor de eerste geselecteerde ontvanger: ${previewRecipient.email}`
                : "Selecteer een ontvanger om de naam in het voorbeeld te zien."}
            </p>
            <p className="mt-1 truncate text-xs text-[#4f6a5d]">
              Onderwerp: {fillPlaceholders(template.subject, previewValues, "text")}
            </p>
            <iframe
              title="Voorbeeld van de e-mail"
              sandbox=""
              srcDoc={fillPlaceholders(template.html, previewValues, "html")}
              className="mt-1 h-80 w-full rounded-xl border border-[#cfecc7] bg-white"
            />
          </div>

          <RecipientPicker
            key={selected}
            participants={participants}
            onSelectionChange={setSelectedIds}
            allowExtra={!template.isSystem}
            initialFilter={selected === "address_reminder" ? "no-address" : "all"}
          />

          <label className="flex items-center gap-2 text-sm text-[#234a37]">
            <input type="checkbox" name="confirm" value="yes" />
            Ik wil deze e-mail nu naar de geselecteerde ontvangers versturen
          </label>

          <button type="submit" disabled={pending} className="baby-button-primary px-4 py-2 text-sm">
            Versturen
          </button>
        </form>
      )}
    </div>
  );
}
