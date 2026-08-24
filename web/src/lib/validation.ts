import { z } from "zod";

export const accessRequestSchema = z.object({
  accessCode: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export const adminAccessRequestSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export const predictionInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  gender: z.enum(["boy", "girl"]),
  weightKg: z.coerce.number().min(0.5).max(10),
  heightCm: z.coerce.number().int().min(20).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const addressInputSchema = z.object({
  recipientName: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(100),
  houseNumber: z.string().trim().min(1).max(20),
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
});

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
