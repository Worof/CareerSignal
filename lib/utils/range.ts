import { RANGE_OPTIONS, type RangeKey } from "@/lib/constants";
import { rangeEndingOn, type DateRange } from "@/lib/calculations/trends";

export interface ResolvedRange {
  key: RangeKey;
  range: DateRange;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves ?range=7d|30d|90d|6m|custom&from=…&to=… into an inclusive date range. */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  todayIso: string,
  fallback: RangeKey = "30d",
): ResolvedRange {
  const key = (RANGE_OPTIONS.find((o) => o.value === params.range)?.value ?? fallback) as RangeKey;
  if (key === "custom") {
    if (params.from && params.to && ISO.test(params.from) && ISO.test(params.to) && params.from <= params.to) {
      return { key, range: { from: params.from, to: params.to } };
    }
    return { key: fallback === "custom" ? "30d" : fallback, range: rangeEndingOn(todayIso, daysFor(fallback)) };
  }
  return { key, range: rangeEndingOn(todayIso, daysFor(key)) };
}

function daysFor(key: RangeKey): number {
  return RANGE_OPTIONS.find((o) => o.value === key)?.days || 30;
}
