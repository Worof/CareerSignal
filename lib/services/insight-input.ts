import type { VisibilityTotals } from "@/lib/calculations/aggregate";
import { comparePeriods } from "@/lib/calculations/trends";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import type { InsightType } from "@/lib/constants";
import type { ReportData } from "./report.service";
import { countByType } from "@/lib/calculations/aggregate";

const round = (v: number | null, d = 2) => (v === null ? null : Number(v.toFixed(d)));

function totalsBlock(t: VisibilityTotals) {
  const engaged =
    t.reactions !== null && t.comments !== null && t.reposts !== null ? t.reactions + t.comments + t.reposts : null;
  return {
    impressions: t.impressions,
    members_reached: t.members_reached,
    profile_views: t.profile_views,
    search_appearances: t.search_appearances,
    follower_growth: t.follower_growth,
    total_interactions: engaged,
    engagement_rate_by_impressions_pct: round(t.engagementRate),
    snapshots_included: t.snapshotCount,
  };
}

/**
 * Builds the ONLY payload the AI provider sees. It contains aggregate numbers and the user's own target
 * lists — never contact names, notes, post bodies, URLs, screenshots or any identifier.
 */
export function buildInsightInput(type: InsightType, r: ReportData) {
  const cmp = (cur: number | null, prev: number | null) => {
    const c = comparePeriods(cur, prev);
    return { current: c.current, previous: c.previous, absolute_change: c.absoluteChange, percent_change: round(c.percentChange, 1) };
  };

  const base = {
    insight_type: type,
    reporting_period: r.range,
    comparison_period: r.previous,
    metrics_current: totalsBlock(r.totals),
    metrics_previous: totalsBlock(r.prevTotals),
    comparisons: {
      impressions: cmp(r.totals.impressions, r.prevTotals.impressions),
      members_reached: cmp(r.totals.members_reached, r.prevTotals.members_reached),
      profile_views: cmp(r.totals.profile_views, r.prevTotals.profile_views),
      search_appearances: cmp(r.totals.search_appearances, r.prevTotals.search_appearances),
      engagement_rate_pct: cmp(round(r.totals.engagementRate), round(r.prevTotals.engagementRate)),
    },
    audience_fit_current: r.fit
      ? {
          score: round(r.fit.score, 1),
          status: r.fit.result.status,
          data_coverage_ratio: round(r.fit.result.coverage.ratio, 2),
          dimensions: r.fit.result.contributions.map((c) => ({ dimension: c.dimension, match_rate_pct: round(c.matchRate * 100, 1) })),
          explanation: r.fit.result.explanation,
        }
      : null,
    audience_fit_previous: r.previousFit ? { score: round(r.previousFit.score, 1), status: r.previousFit.result.status } : null,
    targets: r.goal
      ? {
          job_titles: r.goal.target_job_titles,
          industries: r.goal.target_industries,
          seniority: r.goal.target_seniority,
          locations: r.goal.target_locations,
        }
      : null,
    opportunities: {
      current_period: {
        recruiter_or_hr: countByType(r.currentOpps, ["recruiter_inquiry", "hr_contact"]),
        hiring_manager: countByType(r.currentOpps, ["hiring_manager_contact"]),
        interview_invitations: countByType(r.currentOpps, ["interview_invitation"]),
        referrals: countByType(r.currentOpps, ["referral"]),
        offers: countByType(r.currentOpps, ["job_offer"]),
        total_recorded: r.currentOpps.length,
        qualified_attributed_to_linkedin: r.qualifiedPer1000.qualified,
      },
      previous_period: {
        recruiter_or_hr: countByType(r.previousOpps, ["recruiter_inquiry", "hr_contact"]),
        hiring_manager: countByType(r.previousOpps, ["hiring_manager_contact"]),
        interview_invitations: countByType(r.previousOpps, ["interview_invitation"]),
        total_recorded: r.previousOpps.length,
      },
      note: "Opportunities and their attribution are user-reported.",
    },
  };

  if (type === "content_recommendations") {
    const rows = r.posts
      .filter((p) => p.latest)
      .slice(0, 15)
      .map((p) => ({
        content_type: p.post.content_type,
        topics: p.post.topics,
        impressions: p.latest?.impressions ?? null,
        engagement_rate_pct: round(p.engagementRate),
        profile_activity: p.latest?.profile_activity ?? null,
        audience_fit_score: round(p.fit?.score ?? null, 1),
      }));
    return { ...base, posts: rows };
  }
  return base;
}

export function hasEnoughData(r: ReportData): { ok: true } | { ok: false; reason: string } {
  if (r.currentSnapshots.length === 0 && r.fit === null) {
    return { ok: false, reason: "There is no analytics data in the selected period. Import some analytics first." };
  }
  return { ok: true };
}

export { engagementRateByImpressions };
