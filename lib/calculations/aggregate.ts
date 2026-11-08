import { LINKEDIN_ATTRIBUTION, VISIBILITY_SOURCE_TYPES } from "@/lib/constants";
import type { AnalyticsSnapshot, Opportunity } from "@/lib/types/db";
import { engagementRateByImpressions } from "./engagement";
import { isWithin, sumNullable, type DateRange } from "./trends";

export interface VisibilityTotals {
  impressions: number | null;
  members_reached: number | null;
  profile_views: number | null;
  search_appearances: number | null;
  follower_growth: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  /** Latest known follower total in the range (a stock, not a flow). */
  total_followers: number | null;
  engagementRate: number | null;
  snapshotCount: number;
}

/** Snapshots whose reporting period ENDS inside the range. Different source types are never merged. */
export function snapshotsInRange(snapshots: AnalyticsSnapshot[], range: DateRange): AnalyticsSnapshot[] {
  return snapshots.filter((s) => isWithin(s.reporting_period_end, range));
}

/**
 * Totals use only visibility source types (profile analytics + search appearances) so that
 * per-post analytics and demographic screenshots can never double count impressions.
 * A metric is null — not 0 — when no snapshot in the range provided it.
 */
export function aggregateVisibility(snapshots: AnalyticsSnapshot[]): VisibilityTotals {
  const vis = snapshots.filter((s) => (VISIBILITY_SOURCE_TYPES as string[]).includes(s.source_type));
  const sum = (k: keyof AnalyticsSnapshot) => sumNullable(vis.map((s) => s[k] as number | null));

  // Engagement rate only from snapshots that carry every required input.
  let engaged = 0;
  let impressions = 0;
  let any = false;
  for (const s of vis) {
    const r = engagementRateByImpressions(s);
    if (r.available) {
      any = true;
      engaged += (r.value / 100) * (s.impressions as number);
      impressions += s.impressions as number;
    }
  }

  const latest = [...vis]
    .filter((s) => s.total_followers !== null)
    .sort((a, b) => b.reporting_period_end.localeCompare(a.reporting_period_end))[0];

  return {
    impressions: sum("impressions"),
    members_reached: sum("members_reached"),
    profile_views: sum("profile_views"),
    search_appearances: sum("search_appearances"),
    follower_growth: sum("follower_growth"),
    reactions: sum("reactions"),
    comments: sum("comments"),
    reposts: sum("reposts"),
    total_followers: latest?.total_followers ?? null,
    engagementRate: any && impressions > 0 ? (engaged / impressions) * 100 : null,
    snapshotCount: vis.length,
  };
}

export function opportunitiesInRange(opps: Opportunity[], range: DateRange): Opportunity[] {
  return opps.filter((o) => isWithin(o.received_at, range));
}

export function countByType(opps: Opportunity[], types: string[]): number {
  return opps.filter((o) => types.includes(o.opportunity_type)).length;
}

export function countQualifiedAttributed(opps: Opportunity[]): number {
  return opps.filter((o) => o.is_relevant && (LINKEDIN_ATTRIBUTION as readonly string[]).includes(o.attribution_source)).length;
}

export function countByStatus(opps: Opportunity[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of opps) out[o.status] = (out[o.status] ?? 0) + 1;
  return out;
}

/** Opportunity counts per calendar month (YYYY-MM) for charting. */
export function opportunitiesByMonth(opps: Opportunity[]): Array<{ month: string; count: number; relevant: number }> {
  const map = new Map<string, { count: number; relevant: number }>();
  for (const o of opps) {
    const m = o.received_at.slice(0, 7);
    const cur = map.get(m) ?? { count: 0, relevant: 0 };
    cur.count += 1;
    if (o.is_relevant) cur.relevant += 1;
    map.set(m, cur);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
}
