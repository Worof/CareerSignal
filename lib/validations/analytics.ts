import { z } from "zod";
import { DIMENSIONS, SOURCE_TYPES } from "@/lib/constants";
import { checkbox, isoDate, nullableCount, nullablePercentage, nullableSignedInt, nullableText, uuid } from "./common";

const sourceTypeValues = SOURCE_TYPES.map((s) => s.value) as [string, ...string[]];

export const snapshotSchema = z
  .object({
    source_type: z.enum(sourceTypeValues),
    reporting_period_start: isoDate,
    reporting_period_end: isoDate,
    impressions: nullableCount,
    members_reached: nullableCount,
    profile_views: nullableCount,
    search_appearances: nullableCount,
    total_followers: nullableCount,
    follower_growth: nullableSignedInt,
    reactions: nullableCount,
    comments: nullableCount,
    reposts: nullableCount,
    notes: nullableText(2000),
  })
  .refine((d) => d.reporting_period_end >= d.reporting_period_start, {
    path: ["reporting_period_end"],
    message: "End date must be on or after the start date",
  })
  .refine(
    (d) =>
      [d.impressions, d.members_reached, d.profile_views, d.search_appearances, d.total_followers, d.follower_growth, d.reactions, d.comments, d.reposts].some(
        (v) => v !== null,
      ),
    { path: ["impressions"], message: "Enter at least one metric" },
  );
export type SnapshotInput = z.output<typeof snapshotSchema>;

export const segmentSchema = z
  .object({
    snapshot_id: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
    post_id: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
    dimension: z.enum(DIMENSIONS),
    segment_name: z.string().trim().min(1, "Enter a name").max(200),
    percentage: nullablePercentage,
    member_count: nullableCount,
    is_estimated: checkbox,
  })
  .refine((d) => Boolean(d.snapshot_id) !== Boolean(d.post_id), { message: "A segment belongs to one snapshot or one post" })
  .refine((d) => d.percentage !== null || d.member_count !== null, {
    path: ["percentage"],
    message: "Enter a percentage or a member count",
  });
export type SegmentInput = z.output<typeof segmentSchema>;
