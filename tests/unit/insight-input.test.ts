import { describe, expect, it } from "vitest";
import { buildInsightInput } from "@/lib/services/insight-input";
import { aggregateVisibility } from "@/lib/calculations/aggregate";
import type { ReportData } from "@/lib/services/report.service";
import type { Opportunity } from "@/lib/types/db";

const opp: Opportunity = {
  id: "1", user_id: "u", company_name: "SecretCorp", contact_name: "Jane Recruiter", contact_role: "VP Talent",
  opportunity_type: "recruiter_inquiry", related_job_title: null, received_at: "2026-10-10", source: null,
  attribution_source: "linkedin_post", status: "new", is_relevant: true, notes: "call her at 555-0100",
  last_interaction_at: null, outcome_at: null, created_at: "", updated_at: "",
};

const report = {
  range: { from: "2026-10-01", to: "2026-10-31" }, previous: { from: "2026-09-01", to: "2026-09-30" },
  goal: { target_job_titles: ["Data Scientist"], target_industries: [], target_seniority: [], target_locations: [] },
  totals: aggregateVisibility([]), prevTotals: aggregateVisibility([]),
  fit: null, previousFit: null, currentOpps: [opp], previousOpps: [],
  qualifiedPer1000: { qualified: 1, membersReached: null, periodsAligned: false },
  posts: [], currentSnapshots: [], previousSnapshots: [],
} as unknown as ReportData;

describe("buildInsightInput privacy boundary", () => {
  const json = JSON.stringify(buildInsightInput("weekly_summary", report));
  it("never contains contact names, companies, notes or ids", () => {
    for (const secret of ["Jane Recruiter", "SecretCorp", "555-0100", "VP Talent"]) expect(json).not.toContain(secret);
  });
  it("sends counts and the user's own targets only", () => {
    expect(json).toContain("Data Scientist");
    expect(json).toContain('"total_recorded":1');
  });
  it("represents missing metrics as null, not zero", () => {
    const parsed = JSON.parse(json);
    expect(parsed.metrics_current.impressions).toBeNull();
    expect(parsed.comparisons.impressions.percent_change).toBeNull();
  });
});
