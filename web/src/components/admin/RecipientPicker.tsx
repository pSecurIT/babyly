"use client";

import { useEffect, useMemo, useState } from "react";

export type PickerParticipant = {
  id: string;
  name: string | null;
  email: string;
  hasPrediction: boolean;
  hasAddress: boolean;
};

type Filter = "all" | "no-address" | "has-address";

type RecipientPickerProps = {
  participants: PickerParticipant[];
  allowExtra?: boolean;
  initialFilter?: Filter;
  onSelectionChange?: (ids: Set<string>) => void;
};

export function RecipientPicker({ participants, allowExtra = true, initialFilter = "all", onSelectionChange }: RecipientPickerProps) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraEmails, setExtraEmails] = useState("");

  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return participants.filter((participant) => {
      if (filter === "no-address" && !(participant.hasPrediction && !participant.hasAddress)) return false;
      if (filter === "has-address" && !participant.hasAddress) return false;
      if (!needle) return true;
      return `${participant.name ?? ""} ${participant.email}`.toLowerCase().includes(needle);
    });
  }, [participants, filter, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((participant) => selected.has(participant.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const participant of visible) {
        if (allVisibleSelected) next.delete(participant.id);
        else next.add(participant.id);
      }
      return next;
    });
  }

  return (
    <fieldset className="rounded-2xl border border-[#cfecc7] p-4">
      <legend className="px-2 text-sm font-semibold text-[#234a37]">Ontvangers</legend>

      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="participantId" value={id} />
      ))}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          aria-label="Filter deelnemers"
          className="rounded-xl border border-[#cfecc7] bg-white px-3 py-2"
        >
          <option value="all">Alle deelnemers</option>
          <option value="no-address">Voorspelling, zonder adres</option>
          <option value="has-address">Met adres</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op naam of e-mail"
          aria-label="Zoek deelnemers"
          className="min-w-56 flex-1 rounded-xl border border-[#cfecc7] bg-white px-3 py-2"
        />
        <span className="text-[#4f6a5d]">{selected.size} geselecteerd</span>
      </div>

      <div className="mt-3 max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#cfecc7] text-left text-[#4f6a5d]">
              <th className="w-10 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Selecteer alle zichtbare deelnemers"
                />
              </th>
              <th className="py-2 pr-4">Naam</th>
              <th className="py-2 pr-4">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((participant) => (
              <tr key={participant.id} className="border-b border-[#ebf5e8]">
                <td className="py-1">
                  <input
                    type="checkbox"
                    checked={selected.has(participant.id)}
                    onChange={() => toggle(participant.id)}
                    aria-label={`Selecteer ${participant.email}`}
                  />
                </td>
                <td className="py-1 pr-4">{participant.name ?? "-"}</td>
                <td className="py-1 pr-4">{participant.email}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-[#4f6a5d]">
                  Geen deelnemers gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {allowExtra && (
        <label className="mt-4 block text-sm font-semibold text-[#234a37]">
          Extra e-mailadressen (gescheiden door komma, spatie of nieuwe regel)
          <textarea
            name="extraEmails"
            rows={3}
            value={extraEmails}
            onChange={(event) => setExtraEmails(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#cfecc7] bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
      )}
    </fieldset>
  );
}
