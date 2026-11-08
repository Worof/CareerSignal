import { describe, expect, it } from "vitest";
import {
  aggregateVisibility, countByStatus, countQualifiedAttributed, opportunitiesByMonth, snapshotsInRange,
} from "@/lib/calculations/aggregate";
import type { AnalyticsSnapshot, Opportunity } from "@/lib/types/db";

const snap = (o: Partial<AnalyticsSnapshot>): AnalyticsSnapshot => ({
  id: crypto.randomUUID(), user_id: "u", source_type: "profile_analytics", data_source: "manual", upload_job_id: null,
  reporting_period_start: "2026-10-01", reporting_period_end: "2026-10-31",
  impressions: null, members_reached: null, profile_views: null, search_appearances: null, total_followers: null,
  follower_growth: null, reactions: null, comments: null, reposts: null, notes: null, created_at: "", updated_at: "", ...o,
});
const opp = (o: Partial<Opportunity>): Opportunity => ({
  id: crypto.randomUUID(), user_id: "u", company_name: "Acme", contact_name: null, contact_role: null,
  opportunity_type: "recruiter_inquiry", related_job_title: null, received_at: "2026-10-10", source: null,
  attribution_source: "unknown", status: "new", is_relevant: true, notes: null, last_interaction_at: null,
  outcome_at: null, created_at: "", updated_at: "", ...o,
});

describe("aggregateVisibility", () => {
  it("returns null (not 0) for metrics nobody provided", () => {
    const t = aggregateVisibility([snap({ impressions: 100 })]);
    expect(t.impressions).toBe(100);
    expect(t.profile_views).toBeNull();
    expect(t.engagementRate).toBeNull();
  });
  it("sums across snapshots and ignores null gaps", () => {
    const t = aggregateVisibility([snap({ impressions: 100 }), snap({ impressions: null, profile_views: 5 }), snap({ impressions: 50 })]);
    expect(t.impressions).toBe(150);
    expect(t.profile_views).toBe(5);
  });
  it("never double counts per-post or demographic snapshot types", () => {
    const t = aggregateVisibility([snap({ impressions: 100 }), snap({ source_type: "post_analytics", impressions: 9999 })]);
    expect(t.impressions).toBe(100);
  });
  it("computes a pooled engagement rate only from complete snapshots", () => {
    const t = aggregateVisibility([
      snap({ impressions: 1000, reactions: 40, comments: 5, reposts: 5 }),  // 5%
      snap({ impressions: 1000, reactions: null, comments: 5, reposts: 5 }), // incomplete → excluded
    ]);
    expect(t.engagementRate).toBeCloseTo(5);
  });
  it("uses the latest follower total (a stock, not a flow)", () => {
    const t = aggregateVisibility([
      snap({ reporting_period_end: "2026-09-30", total_followers: 100 }),
      snap({ reporting_period_end: "2026-10-31", total_followers: 130 }),
    ]);
    expect(t.total_followers).toBe(130);
  });
});

describe("snapshotsInRange", () => {
  it("selects by period end, inclusively", () => {
    const a = snap({ reporting_period_end: "2026-10-31" });
    const b = snap({ reporting_period_end: "2026-11-01" });
    expect(snapshotsInRange([a, b], { from: "2026-10-01", to: "2026-10-31" })).toEqual([a]);
  });
});

describe("opportunity helpers", () => {
  it("counts qualified opportunities only when relevant AND attributed to LinkedIn", () => {
    expect(countQualifiedAttributed([
      opp({ attribution_source: "linkedin_post" }),
      opp({ attribution_source: "linkedin_search", is_relevant: false }),
      opp({ attribution_source: "external_referral" }),
      opp({ attribution_source: "unknown" }),
    ])).toBe(1);
  });
  it("groups by status and by month", () => {
    const list = [opp({ status: "new" }), opp({ status: "new" }), opp({ status: "closed", received_at: "2026-09-02", is_relevant: false })];
    expect(countByStatus(list)).toEqual({ new: 2, closed: 1 });
    expect(opportunitiesByMonth(list)).toEqual([
      { month: "2026-09", count: 1, relevant: 0 },
      { month: "2026-10", count: 2, relevant: 2 },
    ]);
  });
});
