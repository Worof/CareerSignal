import { describe, expect, it } from "vitest";
import { segmentSchema, snapshotSchema } from "@/lib/validations/analytics";
import { formatSynonyms, parseSynonyms, weightsSchema } from "@/lib/validations/goals";
import { opportunitySchema } from "@/lib/validations/opportunities";
import { postSchema } from "@/lib/validations/content";
import { formDataToObject, parseWith } from "@/lib/utils/action-state";

const base = { source_type: "profile_analytics", reporting_period_start: "2026-10-01", reporting_period_end: "2026-10-31" };

describe("snapshotSchema", () => {
  it("keeps blank metrics as null, never zero", () => {
    const r = snapshotSchema.parse({ ...base, impressions: "1200", members_reached: "", profile_views: "" });
    expect(r.impressions).toBe(1200);
    expect(r.members_reached).toBeNull();
    expect(r.profile_views).toBeNull();
  });
  it("keeps an explicit 0 as 0", () => {
    expect(snapshotSchema.parse({ ...base, impressions: "0" }).impressions).toBe(0);
  });
  it("requires at least one metric", () => {
    expect(snapshotSchema.safeParse({ ...base }).success).toBe(false);
  });
  it("rejects end before start, negatives and fractions", () => {
    expect(snapshotSchema.safeParse({ ...base, reporting_period_end: "2026-09-01", impressions: "1" }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...base, impressions: "-5" }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...base, impressions: "1.5" }).success).toBe(false);
  });
  it("allows negative follower growth", () => {
    expect(snapshotSchema.parse({ ...base, follower_growth: "-12" }).follower_growth).toBe(-12);
  });
  it("rejects unknown source types", () => {
    expect(snapshotSchema.safeParse({ ...base, source_type: "tiktok", impressions: "1" }).success).toBe(false);
  });
});

describe("segmentSchema", () => {
  const seg = { snapshot_id: "7a8f4c1e-52b3-4c5d-9e1f-0a1b2c3d4e5f", dimension: "job_title", segment_name: "Recruiter", percentage: "12.5" };
  it("accepts a valid segment", () => expect(segmentSchema.parse(seg).percentage).toBe(12.5));
  it("needs a percentage or a count", () => expect(segmentSchema.safeParse({ ...seg, percentage: "" }).success).toBe(false));
  it("rejects percentages over 100", () => expect(segmentSchema.safeParse({ ...seg, percentage: "101" }).success).toBe(false));
  it("needs exactly one parent", () => {
    expect(segmentSchema.safeParse({ ...seg, snapshot_id: "" }).success).toBe(false);
    expect(segmentSchema.safeParse({ ...seg, post_id: "7a8f4c1e-52b3-4c5d-9e1f-0a1b2c3d4e5e" }).success).toBe(false);
  });
});

describe("weights & synonyms", () => {
  it("rejects all-zero weights", () => {
    expect(weightsSchema.safeParse({ job_titles: 0, industries: 0, companies: 0, seniority: 0, locations: 0 }).success).toBe(false);
    expect(weightsSchema.safeParse({ job_titles: 35, industries: 25, companies: 20, seniority: 15, locations: 5 }).success).toBe(true);
  });
  it("round-trips synonym text", () => {
    const m = parseSynonyms("ML Engineer = machine learning engineer, ml eng\n\nbad line");
    expect(m).toEqual({ "ml engineer": ["machine learning engineer", "ml eng"] });
    expect(parseSynonyms(formatSynonyms(m))).toEqual(m);
  });
});

describe("opportunity & post schemas", () => {
  const opp = { company_name: "Acme", opportunity_type: "recruiter_inquiry", received_at: "2026-10-10", attribution_source: "unknown", status: "new" };
  it("maps checkbox + blank optionals", () => {
    const r = opportunitySchema.parse({ ...opp, is_relevant: "on", contact_name: "  ", last_interaction_at: "" });
    expect(r.is_relevant).toBe(true);
    expect(r.contact_name).toBeNull();
    expect(r.last_interaction_at).toBeNull();
    expect(opportunitySchema.parse({ ...opp }).is_relevant).toBe(false);
  });
  it("rejects invalid enums", () => {
    expect(opportunitySchema.safeParse({ ...opp, status: "ghosted" }).success).toBe(false);
  });
  it("validates post URL scheme and parses topics", () => {
    expect(postSchema.safeParse({ title: "t", content_type: "text", post_url: "javascript:alert(1)", published_at: "" }).success).toBe(false);
    const r = postSchema.parse({ title: "t", content_type: "text", post_url: "https://linkedin.com/x", topics: "ml, data , ml", published_at: "" });
    expect(r.topics).toEqual(["ml", "data"]);
    expect(r.published_at).toBeNull();
  });
});

describe("form helpers", () => {
  it("formDataToObject collapses repeated keys into arrays", () => {
    const fd = new FormData();
    fd.append("a", "1"); fd.append("a", "2"); fd.append("b", "x");
    expect(formDataToObject(fd)).toEqual({ a: ["1", "2"], b: "x" });
  });
  it("parseWith returns field errors", () => {
    const r = parseWith(snapshotSchema, { ...base });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.state.fieldErrors?.impressions?.[0]).toMatch(/at least one metric/i);
  });
});
