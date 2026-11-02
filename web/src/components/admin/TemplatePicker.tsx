"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { value: string; label: string };
type Group = { label: string; options: Option[] };

type TemplatePickerProps = {
  label: string;
  buttonLabel: string;
  placeholder?: string;
  groups: Group[];
  // Placeholders in the URL are replaced with the encoded selection.
  hrefTemplate: string;
  allowEmpty?: boolean;
  emptyHref?: string;
  primary?: boolean;
};

const selectClass = "min-w-64 rounded-xl border border-[#cfecc7] bg-white px-3 py-2 text-sm text-[#234a37]";

export function TemplatePicker(props: TemplatePickerProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const disabled = !value && !props.allowEmpty;

  function go() {
    if (value) {
      router.push(props.hrefTemplate.replace("{value}", encodeURIComponent(value)));
    } else if (props.emptyHref) {
      router.push(props.emptyHref);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={value} onChange={(event) => setValue(event.target.value)} aria-label={props.label} className={selectClass}>
        <option value="">{props.placeholder ?? "Kies een sjabloon"}</option>
        {props.groups.map((group) =>
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
      <button
        type="button"
        onClick={go}
        disabled={disabled}
        className={`${props.primary ? "baby-button-primary" : "baby-button-secondary"} px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {props.buttonLabel}
      </button>
    </div>
  );
}
