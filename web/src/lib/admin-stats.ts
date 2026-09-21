export type GenderSplit = {
  boy: number;
  girl: number;
  boyPct: number;
  girlPct: number;
};

export function computeGenderSplit(predictions: { gender: "boy" | "girl" }[]): GenderSplit {
  const boy = predictions.filter((prediction) => prediction.gender === "boy").length;
  const total = predictions.length;
  const girl = total - boy;
  return {
    boy,
    girl,
    boyPct: total > 0 ? Math.round((boy / total) * 100) : 0,
    girlPct: total > 0 ? Math.round((girl / total) * 100) : 0,
  };
}

export type RangeStats = { min: number; max: number; avg: number };

export function computeRangeStats(values: number[]): RangeStats {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return { min, max, avg };
}

export type DateBucket = { label: string; count: number };

export function computeDateBuckets(dates: Date[]): DateBucket[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

export function computeLastNDayBuckets(dates: Date[], days: number): DateBucket[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const buckets: DateBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    buckets.push({ label: key.slice(5), count: counts.get(key) ?? 0 });
  }
  return buckets;
}

export type NameFrequency = { display: string; count: number };

export function computeNameFrequency(names: string[], limit = 20): NameFrequency[] {
  const counts = new Map<string, NameFrequency>();
  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLocaleLowerCase("nl-NL");
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { display: trimmed, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeFillRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}
