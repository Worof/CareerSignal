import { available, unavailable, type MetricResult } from "./types";

export interface EngagementInputs {
  reactions: number | null | undefined;
  comments: number | null | undefined;
  reposts: number | null | undefined;
  impressions: number | null | undefined;
}

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Engagement Rate by Impressions = ((reactions + comments + reposts) / impressions) × 100.
 * The denominator is impressions, never members reached. Returns an explicit
 * "unavailable" result when any input is missing (null ≠ 0) or impressions is 0.
 */
export function engagementRateByImpressions(i: EngagementInputs): MetricResult {
  if (!isNum(i.impressions)) return unavailable("Impressions not provided");
  if (i.impressions <= 0) return unavailable("Impressions is zero");
  if (!isNum(i.reactions) || !isNum(i.comments) || !isNum(i.reposts)) {
    return unavailable("Reactions, comments and reposts are all required");
  }
  return available(((i.reactions + i.comments + i.reposts) / i.impressions) * 100);
}

/** Total interactions, or null when any component is missing. */
export function totalEngagement(i: Pick<EngagementInputs, "reactions" | "comments" | "reposts">): number | null {
  if (!isNum(i.reactions) || !isNum(i.comments) || !isNum(i.reposts)) return null;
  return i.reactions + i.comments + i.reposts;
}
