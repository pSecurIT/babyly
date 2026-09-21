import type { DateBucket, NameFrequency } from "@/lib/admin-stats";

export function GenderDonut({ boyPct, girlPct }: { boyPct: number; girlPct: number }) {
  const circumference = 2 * Math.PI * 40;
  const boyLength = (boyPct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#fbd0d0" strokeWidth="14" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#7ccf73"
          strokeWidth="14"
          strokeDasharray={`${boyLength} ${circumference - boyLength}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-sm">
        <p className="font-bold text-[#4a9d61]">🩵 {boyPct}% jongen</p>
        <p className="font-bold text-[#c2678a]">💗 {girlPct}% meisje</p>
      </div>
    </div>
  );
}

export function BarChart({ data, color = "#7ccf73" }: { data: DateBucket[]; color?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-[#4f6a5d]">Nog geen data.</p>;
  }
  const max = Math.max(1, ...data.map((bucket) => bucket.count));

  return (
    <div className="flex items-end gap-1">
      {data.map((bucket) => (
        <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
          {/* Fixed-height track so the bar's percentage height has something definite to resolve against. */}
          <div className="flex h-28 w-full items-end">
            <div
              className="w-full rounded-t-md"
              style={{ height: `${Math.max(4, (bucket.count / max) * 100)}%`, background: color }}
              title={`${bucket.label}: ${bucket.count}`}
            />
          </div>
          <span className="text-[9px] whitespace-nowrap text-[#4f6a5d]">{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}

export function NameCloud({ names }: { names: NameFrequency[] }) {
  if (names.length === 0) {
    return <p className="text-sm text-[#4f6a5d]">Nog geen namen ingevuld.</p>;
  }
  const counts = names.map((entry) => entry.count);
  const max = Math.max(...counts);
  const min = Math.min(...counts);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-2">
      {names.map((entry) => {
        const scale = max === min ? 1 : (entry.count - min) / (max - min);
        const size = 0.85 + scale * 1.35;
        return (
          <span
            key={entry.display}
            style={{ fontSize: `${size}rem` }}
            className="font-extrabold text-[#4a9d61]"
            title={`${entry.count}x`}
          >
            {entry.display}
          </span>
        );
      })}
    </div>
  );
}

export function RangeStatCard({
  label,
  unit,
  min,
  max,
  avg,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  avg: number;
}) {
  return (
    <div>
      <p className="text-xs text-[#4f6a5d]">{label}</p>
      <p className="text-lg font-extrabold text-[#234a37]">
        {avg}
        {unit} <span className="text-xs font-normal text-[#4f6a5d]">gem.</span>
      </p>
      <p className="text-xs text-[#4f6a5d]">
        {min}
        {unit} – {max}
        {unit}
      </p>
    </div>
  );
}

export function ProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#4f6a5d]">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[#ebf9ee]">
        <div className="h-full rounded-full bg-[#7ccf73]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
