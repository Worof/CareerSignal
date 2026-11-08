import { describe, expect, it } from "vitest";
import { engagementRateByImpressions, totalEngagement } from "@/lib/calculations/engagement";
import { comparePeriods, daysInRange, isWithin, previousPeriod, rangeEndingOn, sumNullable } from "@/lib/calculations/trends";
import { qualifiedOpportunitiesPer1000 } from "@/lib/calculations/conversion";

describe("engagementRateByImpressions", () => {
  it("computes ((reactions + comments + reposts) / impressions) × 100", () => {
    const r = engagementRateByImpressions({ reactions: 40, comments: 8, reposts: 2, impressions: 1000 });
    expect(r).toEqual({ available: true, value: 5 });
  });
  it("is unavailable when impressions are missing or zero", () => {
    expect(engagementRateByImpressions({ reactions: 1, comments: 1, reposts: 1, impressions: null }).available).toBe(false);
    expect(engagementRateByImpressions({ reactions: 1, comments: 1, reposts: 1, impressions: 0 }).available).toBe(false);
  });
  it("is unavailable when any engagement input is missing (null is not zero)", () => {
    expect(engagementRateByImpressions({ reactions: 10, comments: null, reposts: 0, impressions: 100 }).available).toBe(false);
  });
  it("treats an explicit zero as a real value", () => {
    expect(engagementRateByImpressions({ reactions: 0, comments: 0, reposts: 0, impressions: 100 })).toEqual({ available: true, value: 0 });
  });
  it("totalEngagement returns null when incomplete", () => {
    expect(totalEngagement({ reactions: 1, comments: 2, reposts: 3 })).toBe(6);
    expect(totalEngagement({ reactions: 1, comments: null, reposts: 3 })).toBeNull();
  });
});

describe("comparePeriods", () => {
  it("calculates percentage and absolute change", () => {
    expect(comparePeriods(150, 100)).toMatchObject({ absoluteChange: 50, percentChange: 50, direction: "up" });
    expect(comparePeriods(50, 100)).toMatchObject({ absoluteChange: -50, percentChange: -50, direction: "down" });
    expect(comparePeriods(100, 100)).toMatchObject({ absoluteChange: 0, percentChange: 0, direction: "flat" });
  });
  it("handles a zero previous value with absolute change only", () => {
    expect(comparePeriods(10, 0)).toMatchObject({ absoluteChange: 10, percentChange: null, direction: "up" });
  });
  it("handles missing values as unavailable, never as zero", () => {
    expect(comparePeriods(10, null)).toMatchObject({ absoluteChange: null, percentChange: null, direction: "unavailable" });
    expect(comparePeriods(null, 10).direction).toBe("unavailable");
  });
});

describe("period helpers", () => {
  it("builds an equivalent previous period of identical length", () => {
    const r = { from: "2026-10-01", to: "2026-10-30" };
    expect(daysInRange(r)).toBe(30);
    const p = previousPeriod(r);
    expect(p).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(daysInRange(p)).toBe(30);
  });
  it("crosses month and year boundaries", () => {
    expect(previousPeriod({ from: "2026-01-01", to: "2026-01-07" })).toEqual({ from: "2025-12-25", to: "2025-12-31" });
  });
  it("rangeEndingOn is inclusive", () => {
    expect(rangeEndingOn("2026-11-07", 7)).toEqual({ from: "2026-11-01", to: "2026-11-07" });
  });
  it("isWithin is inclusive and ignores the time part", () => {
    const r = { from: "2026-11-01", to: "2026-11-07" };
    expect(isWithin("2026-11-01", r)).toBe(true);
    expect(isWithin("2026-11-07T23:59:00Z", r)).toBe(true);
    expect(isWithin("2026-11-08", r)).toBe(false);
  });
});

describe("sumNullable", () => {
  it("sums present values and returns null when all are missing", () => {
    expect(sumNullable([1, null, 3])).toBe(4);
    expect(sumNullable([null, undefined])).toBeNull();
    expect(sumNullable([])).toBeNull();
    expect(sumNullable([0, null])).toBe(0);
  });
});

describe("qualifiedOpportunitiesPer1000", () => {
  it("calculates per 1,000 members reached", () => {
    expect(qualifiedOpportunitiesPer1000({ membersReached: 5000, qualifiedAttributedOpportunities: 3, periodsAligned: true })).toEqual({ available: true, value: 0.6 });
  });
  it("is unavailable unless every precondition holds", () => {
    expect(qualifiedOpportunitiesPer1000({ membersReached: null, qualifiedAttributedOpportunities: 3, periodsAligned: true }).available).toBe(false);
    expect(qualifiedOpportunitiesPer1000({ membersReached: 0, qualifiedAttributedOpportunities: 3, periodsAligned: true }).available).toBe(false);
    expect(qualifiedOpportunitiesPer1000({ membersReached: 100, qualifiedAttributedOpportunities: 3, periodsAligned: false }).available).toBe(false);
  });
});

import { contentTakeaways, type PostPerf } from "@/lib/calculations/content-insights";

describe("contentTakeaways", () => {
  const p = (o: Partial<PostPerf>): PostPerf => ({ title: "t", topics: [], contentType: "text", fitScore: null, engagementRate: null, profileActivity: null, ...o });
  it("refuses to make claims from fewer than two posts with audience data", () => {
    const r = contentTakeaways([p({ fitScore: 50 }), p({})]);
    expect(r.takeaways).toEqual([]);
    expect(r.insufficient).toMatch(/at least two posts/);
  });
  it("reports a topic only when its average fit clearly differs, with numbers computed from the data", () => {
    const r = contentTakeaways([
      p({ title: "A", topics: ["projects"], fitScore: 70 }),
      p({ title: "B", topics: ["projects"], fitScore: 60 }),
      p({ title: "C", topics: ["news"], fitScore: 20 }),
    ]);
    expect(r.takeaways[0]?.text).toContain("“projects”");
    expect(r.takeaways[0]?.text).toContain("65");
    expect(r.takeaways[0]?.text).toContain("20");
    expect(r.takeaways[0]?.basis).toMatch(/not proof/i);
  });
  it("says so when there is no clear difference", () => {
    const r = contentTakeaways([p({ topics: ["a"], fitScore: 50 }), p({ topics: ["b"], fitScore: 52 })]);
    expect(r.takeaways).toEqual([]);
    expect(r.insufficient).toMatch(/no clear difference/);
  });
  it("contrasts the most-engaging post with the best-fitting post", () => {
    const r = contentTakeaways([p({ title: "Loud", fitScore: 10, engagementRate: 9 }), p({ title: "Quiet", fitScore: 80, engagementRate: 1 })]);
    expect(r.takeaways.some((t) => t.text.includes("“Loud”") && t.text.includes("“Quiet”"))).toBe(true);
  });
});
