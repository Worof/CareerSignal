import {
  DEFAULT_WEIGHTS,
  DIMENSIONS,
  WEIGHT_KEYS,
  type Dimension,
  type ScoringWeights,
} from "@/lib/constants";

/** canonical (normalised) term → list of equivalent terms. */
export type SynonymMap = Record<string, string[]>;

export interface SegmentInput {
  dimension: Dimension;
  segment_name: string;
  percentage: number | null;
  member_count: number | null;
}

export interface TargetsByDimension {
  job_title: string[];
  industry: string[];
  company: string[];
  seniority: string[];
  location: string[];
}

export type MatchType = "exact" | "normalized" | "synonym";

export interface SegmentMatch {
  segment: string;
  weight: number;
  matched: boolean;
  matchType: MatchType | null;
  matchedTarget: string | null;
}

export interface DimensionResult {
  dimension: Dimension;
  /** True when targets exist AND at least one segment carries a usable weight. */
  usable: boolean;
  reason: string | null;
  /** matched weight / total listed weight, 0–1. null when not usable. */
  matchRate: number | null;
  /** Share of the audience (in the unit of `unit`) matched / not matched / listed in total. */
  matchedWeight: number;
  unmatchedWeight: number;
  totalWeight: number;
  unit: "percentage" | "member_count" | null;
  segments: SegmentMatch[];
}

export type FitStatus = "ok" | "low_confidence" | "insufficient_data";

export interface Contribution {
  dimension: Dimension;
  weight: number; // normalised 0–1 over the contributing dimensions
  matchRate: number; // 0–1
  points: number; // weight × matchRate × 100
}

export interface AudienceFitResult {
  /** 0–100, or null when there is not enough data to compute a score. */
  score: number | null;
  status: FitStatus;
  contributions: Contribution[];
  dimensions: Record<Dimension, DimensionResult>;
  coverage: {
    /** Dimensions with targets defined by the user. */
    targetedDimensions: number;
    /** Of those, how many have usable demographic data. */
    dimensionsWithData: number;
    /** 0–1; null when no dimension has targets. */
    ratio: number | null;
    /** Share (0–1) of total configured weight carried by contributing dimensions. */
    weightCovered: number;
  };
  explanation: string;
}

/* ───────────────────────── text matching ───────────────────────── */

export function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Builds term → group-id lookup so any member of a synonym group matches any other. */
function buildSynonymIndex(synonyms: SynonymMap): Map<string, number> {
  const index = new Map<string, number>();
  let group = 0;
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    for (const term of [canonical, ...aliases]) {
      const n = normalizeText(term);
      if (n) index.set(n, group);
    }
    group += 1;
  }
  return index;
}

export function matchSegment(
  segmentName: string,
  targets: string[],
  synonyms: SynonymMap = {},
  index: Map<string, number> = buildSynonymIndex(synonyms),
): { matched: boolean; matchType: MatchType | null; target: string | null } {
  const normSeg = normalizeText(segmentName);
  if (!normSeg) return { matched: false, matchType: null, target: null };

  for (const t of targets) {
    if (t === segmentName) return { matched: true, matchType: "exact", target: t };
  }
  for (const t of targets) {
    if (normalizeText(t) === normSeg) return { matched: true, matchType: "normalized", target: t };
  }
  const segGroup = index.get(normSeg);
  if (segGroup !== undefined) {
    for (const t of targets) {
      if (index.get(normalizeText(t)) === segGroup) return { matched: true, matchType: "synonym", target: t };
    }
  }
  return { matched: false, matchType: null, target: null };
}

/* ───────────────────────── dimension scoring ───────────────────────── */

export function evaluateDimension(
  dimension: Dimension,
  segments: SegmentInput[],
  targets: string[],
  synonyms: SynonymMap = {},
): DimensionResult {
  const base: DimensionResult = {
    dimension,
    usable: false,
    reason: null,
    matchRate: null,
    matchedWeight: 0,
    unmatchedWeight: 0,
    totalWeight: 0,
    unit: null,
    segments: [],
  };

  if (targets.length === 0) return { ...base, reason: "No targets defined for this dimension" };

  const own = segments.filter((s) => s.dimension === dimension);
  if (own.length === 0) return { ...base, reason: "No audience data for this dimension" };

  // Never mix units. Prefer percentages when every segment has one; otherwise member counts.
  const allPct = own.every((s) => typeof s.percentage === "number");
  const allCount = own.every((s) => typeof s.member_count === "number");
  const unit = allPct ? "percentage" : allCount ? "member_count" : null;
  if (!unit) {
    return { ...base, reason: "Segments mix percentages and counts, or have no values" };
  }

  const index = buildSynonymIndex(synonyms);
  const results: SegmentMatch[] = own.map((s) => {
    const weight = (unit === "percentage" ? s.percentage : s.member_count) as number;
    const m = matchSegment(s.segment_name, targets, synonyms, index);
    return { segment: s.segment_name, weight, matched: m.matched, matchType: m.matchType, matchedTarget: m.target };
  });

  const total = results.reduce((a, r) => a + r.weight, 0);
  if (total <= 0) return { ...base, reason: "Audience data sums to zero", segments: results, unit };

  const matchedWeight = results.filter((r) => r.matched).reduce((a, r) => a + r.weight, 0);
  return {
    dimension,
    usable: true,
    reason: null,
    matchRate: matchedWeight / total,
    matchedWeight,
    unmatchedWeight: total - matchedWeight,
    totalWeight: total,
    unit,
    segments: results,
  };
}

/* ───────────────────────── weights ───────────────────────── */

export function sanitizeWeights(input: Partial<ScoringWeights> | null | undefined): ScoringWeights {
  const out = { ...DEFAULT_WEIGHTS };
  if (!input) return out;
  for (const k of Object.keys(out) as (keyof ScoringWeights)[]) {
    const v = input[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  return sum > 0 ? out : { ...DEFAULT_WEIGHTS };
}

/* ───────────────────────── score ───────────────────────── */

/** Below this share of configured weight, the score is flagged low-confidence. */
export const LOW_CONFIDENCE_WEIGHT_THRESHOLD = 0.5;

/**
 * Audience Fit Score = Σ(weight × dimensionMatchRate) / Σ(available weights), × 100.
 * Dimensions without targets or data are EXCLUDED (never treated as zero) and the
 * remaining weights are renormalised to 100%. A pure function — no LLM involved.
 */
export function calculateAudienceFit(params: {
  segments: SegmentInput[];
  targets: TargetsByDimension;
  weights?: Partial<ScoringWeights> | null;
  synonyms?: SynonymMap;
}): AudienceFitResult {
  const weights = sanitizeWeights(params.weights);
  const synonyms = params.synonyms ?? {};

  const dimensions = {} as Record<Dimension, DimensionResult>;
  for (const d of DIMENSIONS) {
    dimensions[d] = evaluateDimension(d, params.segments, params.targets[d], synonyms);
  }

  const targetedDimensions = DIMENSIONS.filter((d) => params.targets[d].length > 0).length;
  const usable = DIMENSIONS.filter((d) => dimensions[d].usable);
  const dimensionsWithData = usable.length;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const usableWeightSum = usable.reduce((a, d) => a + weights[WEIGHT_KEYS[d]], 0);

  const coverage = {
    targetedDimensions,
    dimensionsWithData,
    ratio: targetedDimensions === 0 ? null : dimensionsWithData / targetedDimensions,
    weightCovered: totalWeight > 0 ? usableWeightSum / totalWeight : 0,
  };

  // Usable dimensions whose weight is 0 contribute nothing; if all are zero we cannot score.
  if (usable.length === 0 || usableWeightSum <= 0) {
    return {
      score: null,
      status: "insufficient_data",
      contributions: [],
      dimensions,
      coverage,
      explanation:
        targetedDimensions === 0
          ? "Define target roles, industries or companies to enable the audience-fit assessment."
          : "No audience demographics are available for the dimensions you target yet. Import audience data to calculate a score.",
    };
  }

  const contributions: Contribution[] = usable
    .filter((d) => weights[WEIGHT_KEYS[d]] > 0)
    .map((d) => {
      const w = weights[WEIGHT_KEYS[d]] / usableWeightSum;
      const rate = dimensions[d].matchRate as number;
      return { dimension: d, weight: w, matchRate: rate, points: w * rate * 100 };
    });

  const score = contributions.reduce((a, c) => a + c.points, 0);
  const status: FitStatus = coverage.weightCovered < LOW_CONFIDENCE_WEIGHT_THRESHOLD ? "low_confidence" : "ok";

  return {
    score,
    status,
    contributions,
    dimensions,
    coverage,
    explanation:
      status === "low_confidence"
        ? `Based on ${dimensionsWithData} of ${targetedDimensions} targeted dimensions, covering only ${Math.round(
            coverage.weightCovered * 100,
          )}% of the scoring weight. Treat this score as indicative.`
        : `Based on ${dimensionsWithData} of ${targetedDimensions} targeted dimensions. Dimensions without data are excluded, not counted as zero.`,
  };
}
