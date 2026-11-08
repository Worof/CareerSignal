import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateVisibility,
  countByType,
  countQualifiedAttributed,
  opportunitiesInRange,
  snapshotsInRange,
  type VisibilityTotals,
} from "@/lib/calculations/aggregate";
import type { AudienceFitResult } from "@/lib/calculations/audience-fit";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import { previousPeriod, type DateRange } from "@/lib/calculations/trends";
import { VISIBILITY_SOURCE_TYPES } from "@/lib/constants";
import type { AnalyticsSnapshot, AudienceSegment, CareerGoal, Opportunity, Post, PostMetric } from "@/lib/types/db";
import { listSnapshots } from "./analytics.service";
import { computeAudienceFit, groupBy, listSegmentsForPosts, listSegmentsForSnapshots } from "./audience.service";
import { listPostMetrics, listPosts } from "./content.service";
import { getGoal } from "./goals.service";
import { listOpportunities } from "./opportunity.service";

export interface FitPoint {
  snapshotId: string;
  periodEnd: string;
  score: number | null;
  status: AudienceFitResult["status"];
  result: AudienceFitResult;
}

export interface PostRow {
  post: Post;
  latest: PostMetric | null;
  previous: PostMetric | null;
  engagementRate: number | null;
  previousEngagementRate: number | null;
  fit: AudienceFitResult | null;
}

export interface ReportData {
  range: DateRange;
  previous: DateRange;
  goal: CareerGoal | null;
  snapshots: AnalyticsSnapshot[];
  currentSnapshots: AnalyticsSnapshot[];
  previousSnapshots: AnalyticsSnapshot[];
  totals: VisibilityTotals;
  prevTotals: VisibilityTotals;
  segmentsBySnapshot: Record<string, AudienceSegment[]>;
  fit: FitPoint | null;
  previousFit: FitPoint | null;
  fitSeries: FitPoint[];
  opportunities: Opportunity[];
  currentOpps: Opportunity[];
  previousOpps: Opportunity[];
  qualifiedPer1000: { qualified: number; membersReached: number | null; periodsAligned: boolean };
  posts: PostRow[];
}

function latestWithSegments(points: FitPoint[], range: DateRange): FitPoint | null {
  return (
    points
      .filter((p) => p.periodEnd >= range.from && p.periodEnd <= range.to)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0] ?? null
  );
}

export async function buildReport(supabase: SupabaseClient, range: DateRange): Promise<ReportData> {
  const previous = previousPeriod(range);
  const [goal, allSnapshots, opportunities, postsRaw] = await Promise.all([
    getGoal(supabase, (await supabase.auth.getUser()).data.user?.id ?? ""),
    listSnapshots(supabase),
    listOpportunities(supabase),
    listPosts(supabase),
  ]);

  const snapshots = allSnapshots.filter((s) => s.reporting_period_end <= range.to);
  const currentSnapshots = snapshotsInRange(allSnapshots, range);
  const previousSnapshots = snapshotsInRange(allSnapshots, previous);

  const segments = await listSegmentsForSnapshots(
    supabase,
    snapshots.map((s) => s.id),
  );
  const segmentsBySnapshot = groupBy(segments, (s) => s.analytics_snapshot_id);

  const fitSeries: FitPoint[] = snapshots
    .filter((s) => (segmentsBySnapshot[s.id]?.length ?? 0) > 0)
    .map((s) => {
      const result = computeAudienceFit(segmentsBySnapshot[s.id] ?? [], goal);
      return { snapshotId: s.id, periodEnd: s.reporting_period_end, score: result.score, status: result.status, result };
    })
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const totals = aggregateVisibility(currentSnapshots);
  const prevTotals = aggregateVisibility(previousSnapshots);
  const currentOpps = opportunitiesInRange(opportunities, range);
  const previousOpps = opportunitiesInRange(opportunities, previous);

  // Posts: latest + prior metric snapshot, per-post audience fit when per-post demographics exist.
  const postIds = postsRaw.map((p) => p.id);
  const [metrics, postSegments] = await Promise.all([listPostMetrics(supabase, postIds), listSegmentsForPosts(supabase, postIds)]);
  const metricsByPost = groupBy(metrics, (m) => m.post_id);
  const segmentsByPost = groupBy(postSegments, (s) => s.post_id);
  const posts: PostRow[] = postsRaw.map((post) => {
    const ms = [...(metricsByPost[post.id] ?? [])].sort((a, b) => b.reporting_period_end.localeCompare(a.reporting_period_end));
    const rate = (m: PostMetric | undefined) => {
      if (!m) return null;
      const r = engagementRateByImpressions(m);
      return r.available ? r.value : null;
    };
    const segs = segmentsByPost[post.id] ?? [];
    return {
      post,
      latest: ms[0] ?? null,
      previous: ms[1] ?? null,
      engagementRate: rate(ms[0]),
      previousEngagementRate: rate(ms[1]),
      fit: segs.length > 0 ? computeAudienceFit(segs, goal) : null,
    };
  });

  const qualified = countQualifiedAttributed(currentOpps);
  // Aligned = at least one visibility snapshot exists for the period the opportunities were counted in.
  const periodsAligned = currentSnapshots.some((s) => (VISIBILITY_SOURCE_TYPES as string[]).includes(s.source_type));

  return {
    range,
    previous,
    goal,
    snapshots,
    currentSnapshots,
    previousSnapshots,
    totals,
    prevTotals,
    segmentsBySnapshot,
    fit: latestWithSegments(fitSeries, range),
    previousFit: latestWithSegments(fitSeries, previous),
    fitSeries,
    opportunities,
    currentOpps,
    previousOpps,
    qualifiedPer1000: { qualified, membersReached: totals.members_reached, periodsAligned },
    posts,
  };
}

export { countByType };
