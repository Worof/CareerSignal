import { describe, expect, it } from "vitest";
import {
  calculateAudienceFit,
  evaluateDimension,
  matchSegment,
  normalizeText,
  sanitizeWeights,
  type SegmentInput,
  type TargetsByDimension,
} from "@/lib/calculations/audience-fit";

const seg = (dimension: SegmentInput["dimension"], name: string, percentage: number | null, member_count: number | null = null): SegmentInput => ({
  dimension, segment_name: name, percentage, member_count,
});

const emptyTargets: TargetsByDimension = { job_title: [], industry: [], company: [], seniority: [], location: [] };

describe("normalizeText", () => {
  it("lowercases, strips punctuation and accents, collapses whitespace", () => {
    expect(normalizeText("  Machine-Learning   Engineer! ")).toBe("machine learning engineer");
    expect(normalizeText("Café & Co.")).toBe("cafe and co");
  });
});

describe("matchSegment", () => {
  it("distinguishes exact, normalized and synonym matches", () => {
    expect(matchSegment("Recruiter", ["Recruiter"]).matchType).toBe("exact");
    expect(matchSegment("recruiter ", ["Recruiter"]).matchType).toBe("normalized");
    const syn = { "machine learning engineer": ["ml engineer", "ML Eng"] };
    expect(matchSegment("ML Engineer", ["Machine Learning Engineer"], syn)).toMatchObject({ matched: true, matchType: "synonym" });
  });
  it("does not match unrelated text", () => {
    expect(matchSegment("Chef", ["Recruiter"]).matched).toBe(false);
    expect(matchSegment("", ["Recruiter"]).matched).toBe(false);
  });
});

describe("evaluateDimension", () => {
  it("is unusable without targets or without segments", () => {
    expect(evaluateDimension("job_title", [seg("job_title", "A", 10)], []).usable).toBe(false);
    expect(evaluateDimension("job_title", [], ["A"]).usable).toBe(false);
  });
  it("computes the matched share of the listed audience", () => {
    const r = evaluateDimension("job_title", [seg("job_title", "Recruiter", 10), seg("job_title", "Chef", 30)], ["Recruiter"]);
    expect(r.usable).toBe(true);
    expect(r.matchRate).toBeCloseTo(0.25);
    expect(r.matchedWeight).toBe(10);
    expect(r.unmatchedWeight).toBe(30);
    expect(r.unit).toBe("percentage");
  });
  it("falls back to member counts and never mixes units", () => {
    const counts = evaluateDimension("industry", [seg("industry", "AI", null, 30), seg("industry", "Retail", null, 70)], ["AI"]);
    expect(counts.unit).toBe("member_count");
    expect(counts.matchRate).toBeCloseTo(0.3);
    const mixed = evaluateDimension("industry", [seg("industry", "AI", 30), seg("industry", "Retail", null, 70)], ["AI"]);
    expect(mixed.usable).toBe(false);
  });
  it("treats a zero-sum audience as unusable", () => {
    expect(evaluateDimension("job_title", [seg("job_title", "A", 0)], ["A"]).usable).toBe(false);
  });
});

describe("calculateAudienceFit", () => {
  const targets: TargetsByDimension = {
    ...emptyTargets,
    job_title: ["Recruiter", "Data Scientist"],
    industry: ["Technology"],
    company: ["Acme"],
  };

  it("returns insufficient_data and a null score when nothing is usable", () => {
    const r = calculateAudienceFit({ segments: [], targets });
    expect(r.score).toBeNull();
    expect(r.status).toBe("insufficient_data");
    expect(r.coverage.dimensionsWithData).toBe(0);
  });

  it("explains missing targets differently from missing data", () => {
    const r = calculateAudienceFit({ segments: [], targets: emptyTargets });
    expect(r.score).toBeNull();
    expect(r.coverage.ratio).toBeNull();
    expect(r.explanation).toMatch(/Define target/);
  });

  it("renormalises weights over available dimensions (missing ≠ zero)", () => {
    // job_title 35%, industry 25% usable → normalised 35/60 and 25/60. Company has no data.
    const r = calculateAudienceFit({
      targets,
      segments: [
        seg("job_title", "Recruiter", 50), seg("job_title", "Chef", 50),       // rate 0.5
        seg("industry", "Technology", 100),                                      // rate 1.0
      ],
    });
    const expected = (35 * 0.5 + 25 * 1.0) / 60 * 100;
    expect(r.score).toBeCloseTo(expected, 6);
    expect(r.contributions.map((c) => c.dimension).sort()).toEqual(["industry", "job_title"]);
    expect(r.contributions.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1);
    expect(r.contributions.reduce((a, c) => a + c.points, 0)).toBeCloseTo(expected, 6);
    expect(r.coverage.targetedDimensions).toBe(3);
    expect(r.coverage.dimensionsWithData).toBe(2);
    expect(r.coverage.ratio).toBeCloseTo(2 / 3);
  });

  it("scores 100 for a perfect match and 0 for none", () => {
    const perfect = calculateAudienceFit({ targets: { ...emptyTargets, job_title: ["A"] }, segments: [seg("job_title", "A", 100)] });
    expect(perfect.score).toBe(100);
    const none = calculateAudienceFit({ targets: { ...emptyTargets, job_title: ["A"] }, segments: [seg("job_title", "B", 100)] });
    expect(none.score).toBe(0);
  });

  it("flags low confidence when little of the weight is covered", () => {
    const r = calculateAudienceFit({
      targets: { ...emptyTargets, job_title: ["A"], location: ["Cairo"] },
      segments: [seg("location", "Cairo", 100)], // locations weigh 5 of 100
    });
    expect(r.score).toBe(100);
    expect(r.status).toBe("low_confidence");
    expect(r.coverage.weightCovered).toBeCloseTo(0.05);
  });

  it("respects custom weights and synonyms", () => {
    const r = calculateAudienceFit({
      targets: { ...emptyTargets, job_title: ["Machine Learning Engineer"], industry: ["AI"] },
      weights: { job_titles: 90, industries: 10, companies: 0, seniority: 0, locations: 0 },
      synonyms: { "machine learning engineer": ["ml engineer"] },
      segments: [seg("job_title", "ML Engineer", 100), seg("industry", "Retail", 100)],
    });
    expect(r.score).toBeCloseTo(90);
  });

  it("never returns a score from zero-weight dimensions only", () => {
    const r = calculateAudienceFit({
      targets: { ...emptyTargets, location: ["Cairo"] },
      weights: { job_titles: 50, industries: 50, companies: 0, seniority: 0, locations: 0 },
      segments: [seg("location", "Cairo", 100)],
    });
    expect(r.score).toBeNull();
    expect(r.status).toBe("insufficient_data");
  });
});

describe("sanitizeWeights", () => {
  it("falls back to defaults on invalid input and ignores negatives", () => {
    expect(sanitizeWeights(null).job_titles).toBe(35);
    expect(sanitizeWeights({ job_titles: -5 }).job_titles).toBe(35);
    expect(sanitizeWeights({ job_titles: 10, industries: 0, companies: 0, seniority: 0, locations: 0 }).job_titles).toBe(10);
    expect(sanitizeWeights({ job_titles: 0, industries: 0, companies: 0, seniority: 0, locations: 0 }).industries).toBe(25);
  });
});
