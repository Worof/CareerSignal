export interface DateRange {
  /** Inclusive, ISO date (YYYY-MM-DD). */
  from: string;
  /** Inclusive, ISO date (YYYY-MM-DD). */
  to: string;
}

export type TrendDirection = "up" | "down" | "flat" | "unavailable";

export interface PeriodComparison {
  current: number | null;
  previous: number | null;
  absoluteChange: number | null;
  /** null when percentage change is undefined (previous missing or zero). */
  percentChange: number | null;
  direction: TrendDirection;
}

const DAY_MS = 86_400_000;

function toUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysInRange(r: DateRange): number {
  return Math.round((toUtcMs(r.to) - toUtcMs(r.from)) / DAY_MS) + 1;
}

/** The equivalent period immediately before `r`, with exactly the same number of days. */
export function previousPeriod(r: DateRange): DateRange {
  const len = daysInRange(r);
  const prevTo = toUtcMs(r.from) - DAY_MS;
  return { from: fromUtcMs(prevTo - (len - 1) * DAY_MS), to: fromUtcMs(prevTo) };
}

export function rangeEndingOn(endIso: string, days: number): DateRange {
  const end = toUtcMs(endIso);
  return { from: fromUtcMs(end - (days - 1) * DAY_MS), to: endIso };
}

export function isWithin(dateIso: string, r: DateRange): boolean {
  const d = dateIso.slice(0, 10);
  return d >= r.from && d <= r.to;
}

/** ((current − previous) / previous) × 100, handling zero and missing values explicitly. */
export function comparePeriods(current: number | null, previous: number | null): PeriodComparison {
  if (current === null || previous === null) {
    return { current, previous, absoluteChange: null, percentChange: null, direction: "unavailable" };
  }
  const absoluteChange = current - previous;
  const percentChange = previous === 0 ? null : (absoluteChange / Math.abs(previous)) * 100;
  const direction: TrendDirection = absoluteChange === 0 ? "flat" : absoluteChange > 0 ? "up" : "down";
  return { current, previous, absoluteChange, percentChange, direction };
}

/** Sum of the non-null values; null when every value is missing (never coerces missing to zero). */
export function sumNullable(values: Array<number | null | undefined>): number | null {
  let seen = false;
  let total = 0;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) {
      seen = true;
      total += v;
    }
  }
  return seen ? total : null;
}
