import { describe, expect, it } from "vitest";
import { emailFieldSchemas, freeTextFieldSchemas } from "@/lib/validation";

// One payload set, applied to every registered free-text schema below. Adding a new
// field to `freeTextFieldSchemas` automatically gets covered by every payload here.
const MALICIOUS_PAYLOADS: { label: string; value: string }[] = [
  { label: "script tag", value: "<script>alert(1)</script>" },
  { label: "img onerror", value: '"><img src=x onerror=alert(1)>' },
  { label: "svg onload", value: "<svg/onload=alert(1)>" },
  { label: "closing tag breakout", value: "Emma</textarea><script>alert(1)</script>" },
  { label: "template/backtick injection", value: "`${alert(1)}`" },
  { label: "javascript protocol with tag", value: "<a href=javascript:alert(1)>click</a>" },
  { label: "NUL byte", value: "Emma\u0000" },
  { label: "CRLF header injection", value: "Emma\r\nBcc: evil@example.com" },
  { label: "bidi override spoofing", value: "Emma\u202Egnp.exe" },
  { label: "zero-width spoofing", value: "Emma\u200B\u200B" },
];

const BENIGN_VALUES = [
  "Emma",
  "O'Brien",
  "Jean-Luc",
  "Straße 12",
  "D'Angelo & Zonen",
  "Île-de-France",
];

describe("structurele input-validatie tegen XSS/injectie", () => {
  const entries = Object.entries(freeTextFieldSchemas);

  it("registreert minstens één veld (sanity check)", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [fieldName, schema] of entries) {
    describe(fieldName, () => {
      it.each(MALICIOUS_PAYLOADS)("weigert $label", ({ value }) => {
        const result = schema.safeParse(value);
        expect(result.success, `${fieldName} accepteerde payload: ${value}`).toBe(false);
      });

      it.each(BENIGN_VALUES)("accepteert legitieme waarde \"%s\"", (value) => {
        const result = schema.safeParse(value);
        expect(result.success, `${fieldName} weigerde legitieme waarde: ${value}`).toBe(true);
      });
    });
  }
});

const EMAIL_HEADER_INJECTION_PAYLOADS = [
  "a@b.com\r\nBcc: evil@example.com",
  "a@b.com\nBcc: evil@example.com",
  "a@b.com%0d%0aBcc:evil@example.com",
  "<script>@b.com",
];

describe("structurele validatie van e-mailvelden tegen header-injectie", () => {
  const entries = Object.entries(emailFieldSchemas);

  it("registreert minstens één e-mailveld (sanity check)", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [fieldName, schema] of entries) {
    describe(fieldName, () => {
      it.each(EMAIL_HEADER_INJECTION_PAYLOADS)("weigert header-injectiepayload: %s", (value) => {
        const result = schema.safeParse(value);
        expect(result.success, `${fieldName} accepteerde payload: ${value}`).toBe(false);
      });

      it("accepteert een geldig e-mailadres", () => {
        const result = schema.safeParse("valid.user@example.com");
        expect(result.success).toBe(true);
      });
    });
  }
});
