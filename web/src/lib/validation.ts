import { z } from "zod";

// Control/format characters that have no place in single-line user text and are
// classic injection/spoofing vectors (all C0 controls incl. CR/LF/tab, DEL, bidi
// overrides, zero-width marks). CR/LF in particular enable header/log injection.
const UNSAFE_CHARS_REGEX = /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E]/;
// Blocks markup/template injection at the source rather than relying only on output escaping.
const MARKUP_CHARS_REGEX = /[<>`]/;

/**
 * Structural guard for every free-text form field: trims, bounds length, and rejects
 * characters that enable stored XSS or control-character/spoofing injection. Apply this
 * (rather than a bare z.string()) to any new user-supplied text field.
 */
export function safeText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !UNSAFE_CHARS_REGEX.test(value), {
      message: "Bevat niet-toegestane besturingstekens.",
    })
    .refine((value) => !MARKUP_CHARS_REGEX.test(value), {
      message: "Bevat niet-toegestane tekens (<, > of `).",
    });
}

export const accessRequestSchema = z.object({
  accessCode: z.string().min(1).max(120),
  name: safeText(1, 80),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export const adminAccessRequestSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export const predictionInputSchema = z.object({
  name: safeText(1, 80),
  gender: z.enum(["boy", "girl"]),
  weightKg: z.coerce.number().min(0.5).max(10),
  heightCm: z.coerce.number().int().min(20).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const addressInputSchema = z.object({
  recipientName: safeText(1, 100),
  street: safeText(1, 100),
  houseNumber: safeText(1, 20),
  postalCode: safeText(1, 20),
  city: safeText(1, 80),
  country: safeText(1, 80),
});

// Typed confirmation phrase for destructive admin bulk-clear actions (e.g. "VERWIJDER ADRESSEN").
export const confirmPhraseFieldSchema = z.object({
  confirm: safeText(1, 64),
});

// Registry of every free-text field guarded by `safeText`, used by the dynamic
// injection test suite so newly added fields are covered automatically as long as
// they're registered here alongside their schema.
export const freeTextFieldSchemas = {
  "accessRequestSchema.name": accessRequestSchema.shape.name,
  "predictionInputSchema.name": predictionInputSchema.shape.name,
  "addressInputSchema.recipientName": addressInputSchema.shape.recipientName,
  "addressInputSchema.street": addressInputSchema.shape.street,
  "addressInputSchema.houseNumber": addressInputSchema.shape.houseNumber,
  "addressInputSchema.postalCode": addressInputSchema.shape.postalCode,
  "addressInputSchema.city": addressInputSchema.shape.city,
  "addressInputSchema.country": addressInputSchema.shape.country,
  "confirmPhraseFieldSchema.confirm": confirmPhraseFieldSchema.shape.confirm,
} as const;

// Registry of every email field (format-validated via z.email() instead of safeText),
// checked separately by the injection test suite for header-injection (CRLF) payloads.
export const emailFieldSchemas = {
  "accessRequestSchema.email": accessRequestSchema.shape.email,
  "adminAccessRequestSchema.email": adminAccessRequestSchema.shape.email,
} as const;

// Every field name known to the input-validation schemas (derived, not hand-maintained),
// used to cross-check that visible form inputs in the app are actually validated server-side.
export const knownValidatedFieldNames = new Set([
  ...Object.keys(accessRequestSchema.shape),
  ...Object.keys(adminAccessRequestSchema.shape),
  ...Object.keys(predictionInputSchema.shape),
  ...Object.keys(addressInputSchema.shape),
  ...Object.keys(confirmPhraseFieldSchema.shape),
]);


export function toPredictedBirthAt(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) {
    return null;
  }

  return parsed;
}
