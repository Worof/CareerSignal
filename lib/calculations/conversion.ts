import { available, unavailable, type MetricResult } from "./types";

export interface ConversionInputs {
  membersReached: number | null | undefined;
  /** Opportunities the user marked relevant AND attributed to LinkedIn visibility. */
  qualifiedAttributedOpportunities: number;
  /** True only when opportunity period and analytics period are aligned. */
  periodsAligned: boolean;
}

/**
 * Qualified Opportunities per 1,000 Members Reached.
 * This is an OBSERVED ATTRIBUTION metric, not proof of causation.
 */
export function qualifiedOpportunitiesPer1000(i: ConversionInputs): MetricResult {
  if (!i.periodsAligned) return unavailable("Reporting periods are not aligned");
  if (typeof i.membersReached !== "number" || !Number.isFinite(i.membersReached)) {
    return unavailable("Members reached not provided");
  }
  if (i.membersReached <= 0) return unavailable("Members reached is zero");
  return available((i.qualifiedAttributedOpportunities / i.membersReached) * 1000);
}
