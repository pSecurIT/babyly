import type { Gender } from "@prisma/client";

function csvEscape(value: string): string {
  if (/^\s*[=+\-@]/.test(value)) {
    value = `'${value}`;
  }

  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(values: (string | number)[]): string {
  return values.map((value) => csvEscape(String(value))).join(",");
}

type PredictionCsvRow = {
  predictedName: string;
  gender: Gender;
  weightGrams: number;
  heightCm: number;
  predictedBirthAt: Date;
  createdAt: Date;
  participant: { name: string | null; email: string } | null;
};

export function buildPredictionsCsv(predictions: PredictionCsvRow[]): string {
  const header = toRow([
    "name",
    "email",
    "prediction_name",
    "prediction_gender",
    "prediction_weight_grams",
    "prediction_height_cm",
    "prediction_predicted_birth_at",
    "created_at",
  ]);

  const rows = predictions.map((prediction) =>
    toRow([
      prediction.participant?.name ?? "",
      prediction.participant?.email ?? "",
      prediction.predictedName,
      prediction.gender,
      prediction.weightGrams,
      prediction.heightCm,
      prediction.predictedBirthAt.toISOString(),
      prediction.createdAt.toISOString(),
    ]),
  );

  return [header, ...rows].join("\n");
}

type AddressCsvRow = {
  recipientName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  createdAt: Date;
  participant: { name: string | null; email: string } | null;
};

export function buildAddressesCsv(addresses: AddressCsvRow[]): string {
  const header = toRow([
    "recipient_name",
    "street",
    "house_number",
    "postal_code",
    "city",
    "country",
    "participant_name",
    "participant_email",
    "created_at",
  ]);

  const rows = addresses.map((address) =>
    toRow([
      address.recipientName,
      address.street,
      address.houseNumber,
      address.postalCode,
      address.city,
      address.country,
      address.participant?.name ?? "",
      address.participant?.email ?? "",
      address.createdAt.toISOString(),
    ]),
  );

  return [header, ...rows].join("\n");
}
