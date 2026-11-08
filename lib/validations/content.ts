import { z } from "zod";
import { CONTENT_TYPES } from "@/lib/constants";
import { isoDate, nullableCount, nullableText, stringList, uuid } from "./common";

const contentValues = CONTENT_TYPES.map((c) => c.value) as [string, ...string[]];

export const postSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  post_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().url("Enter a valid URL").regex(/^https?:\/\//i, "URL must start with http(s)://").nullable(),
  ),
  post_text: nullableText(10000),
  content_type: z.enum(contentValues),
  topics: z.preprocess(
    (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v),
    stringList(20, 60),
  ),
  published_at: z.preprocess((v) => (v === "" ? null : v), z.string().nullable()),
});

export const postMetricSchema = z
  .object({
    post_id: uuid,
    reporting_period_start: isoDate,
    reporting_period_end: isoDate,
    impressions: nullableCount,
    reactions: nullableCount,
    comments: nullableCount,
    reposts: nullableCount,
    clicks: nullableCount,
    profile_activity: nullableCount,
  })
  .refine((d) => d.reporting_period_end >= d.reporting_period_start, {
    path: ["reporting_period_end"],
    message: "End date must be on or after the start date",
  })
  .refine((d) => [d.impressions, d.reactions, d.comments, d.reposts, d.clicks, d.profile_activity].some((v) => v !== null), {
    path: ["impressions"],
    message: "Enter at least one metric",
  });
