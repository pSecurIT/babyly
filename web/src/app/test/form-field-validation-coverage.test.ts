import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { knownValidatedFieldNames } from "@/lib/validation";

// Fields that are intentionally not free-text data validated via a zod schema:
// CSRF token, bot honeypot, and a hidden id copied back from the server.
const EXEMPT_FIELD_NAMES = new Set(["csrfToken", "website", "participantId"]);

function findPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return findPageFiles(path);
    }
    return entry.name === "page.tsx" ? [path] : [];
  });
}

function extractFieldNames(source: string): string[] {
  const names: string[] = [];
  const tagRegex = /<(input|textarea)\b([^>]*)>/g;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(source))) {
    const attrs = tagMatch[2];
    const typeMatch = /\btype=["']([^"']+)["']/.exec(attrs);
    const type = typeMatch?.[1] ?? "text";
    // Hidden fields are kept (checked against EXEMPT_FIELD_NAMES by the caller);
    // these types never carry free text worth validating.
    if (["submit", "button", "checkbox", "radio"].includes(type)) {
      continue;
    }
    const nameMatch = /\bname=["']([^"']+)["']/.exec(attrs);
    if (nameMatch) {
      names.push(nameMatch[1]);
    }
  }

  return names;
}

describe("dekking van formuliervelden door input-validatie", () => {
  it("elk zichtbaar of gebruikersinvoerbaar formulierveld is bekend bij een validatieschema", () => {
    const appDirectory = join(__dirname, "..");
    const pageFiles = findPageFiles(appDirectory);

    const uncovered: string[] = [];

    for (const file of pageFiles) {
      const source = readFileSync(file, "utf8");
      const fieldNames = extractFieldNames(source);

      for (const fieldName of fieldNames) {
        if (EXEMPT_FIELD_NAMES.has(fieldName)) {
          continue;
        }
        if (!knownValidatedFieldNames.has(fieldName)) {
          uncovered.push(`${file}: name="${fieldName}"`);
        }
      }
    }

    expect(
      uncovered,
      `Nieuwe formuliervelden zonder validatieschema gevonden:\n${uncovered.join("\n")}\n` +
        "Voeg het veld toe aan een zod-schema in src/lib/validation.ts (bij vrije tekst: gebruik safeText()), " +
        "of voeg het expliciet toe aan EXEMPT_FIELD_NAMES in deze test als het bewust geen vrije tekst is.",
    ).toEqual([]);
  });

  it("houdt minstens de bekende invoervelden bij (sanity check)", () => {
    expect(knownValidatedFieldNames.size).toBeGreaterThan(0);
  });
});
