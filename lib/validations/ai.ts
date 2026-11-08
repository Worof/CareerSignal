import { z } from "zod";
import { DIMENSIONS, SOURCE_TYPES } from "@/lib/constants";

const sourceTypeValues = SOURCE_TYPES.map((s) => s.value) as [string, ...string[]];

const num = z.number().finite().nullable();

/** Structured output requested from the vision model for screenshot extraction. */
export const extractionSchema = z.object({
  source_type: z.enum(sourceTypeValues).nullable(),
  reporting_period: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  metrics: z.object({
    impressions: num,
    members_reached: num,
    profile_views: num,
    search_appearances: num.optional().default(null),
    total_followers: num.optional().default(null),
    follower_growth: num.optional().default(null),
    reactions: num,
    comments: num,
    reposts: num,
  }),
  audience_segments: z
    .array(
      z.object({
        dimension: z.enum(DIMENSIONS),
        value: z.string().min(1).max(200),
        percentage: z.number().min(0).max(100).nullable(),
        member_count: z.number().int().min(0).nullable(),
      }),
    )
    .max(60),
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string()).max(20),
});
export type Extraction = z.output<typeof extractionSchema>;

/** Structured output requested from the model for career insights. */
export const insightOutputSchema = z.object({
  title: z.string().min(1).max(160),
  analysis: z.string().min(1).max(2500),
  recommendation: z.string().max(1500).nullable(),
  /** Each item must name which supplied metric it refers to. */
  evidence: z
    .array(z.object({ metric: z.string().min(1).max(120), observation: z.string().min(1).max(400) }))
    .max(12),
  /** True when the recommendation is general advice not backed by the supplied data. */
  is_general_recommendation: z.boolean(),
});
export type InsightOutput = z.output<typeof insightOutputSchema>;
