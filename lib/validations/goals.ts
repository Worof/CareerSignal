import { z } from "zod";
import { GOAL_TYPES } from "@/lib/constants";
import { stringList } from "./common";

const goalValues = GOAL_TYPES.map((g) => g.value) as [string, ...string[]];

export const weightsSchema = z
  .object({
    job_titles: z.coerce.number().min(0).max(100),
    industries: z.coerce.number().min(0).max(100),
    companies: z.coerce.number().min(0).max(100),
    seniority: z.coerce.number().min(0).max(100),
    locations: z.coerce.number().min(0).max(100),
  })
  .refine((w) => Object.values(w).reduce((a, b) => a + b, 0) > 0, { message: "At least one weight must be above zero" });

/** Partial update used by the onboarding wizard (one step at a time). */
export const goalPatchSchema = z.object({
  goal_types: z.array(z.enum(goalValues)).max(8).optional(),
  target_job_titles: stringList().optional(),
  target_industries: stringList().optional(),
  target_companies: stringList().optional(),
  target_seniority: stringList().optional(),
  target_locations: stringList().optional(),
  step: z.number().int().min(0).max(7).optional(),
  complete: z.boolean().optional(),
});
export type GoalPatch = z.output<typeof goalPatchSchema>;

/** One synonym group per line: "ml engineer = machine learning engineer, ml eng". */
export function parseSynonyms(text: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[=,]/).map((s) => s.trim()).filter(Boolean);
    const [canonical, ...aliases] = parts;
    if (canonical && aliases.length > 0) out[canonical.toLowerCase()] = aliases;
  }
  return out;
}

export function formatSynonyms(map: Record<string, string[]>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k} = ${v.join(", ")}`)
    .join("\n");
}

export const profileSchema = z.object({
  full_name: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  timezone: z
    .string()
    .min(1)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone"),
  preferred_reporting_period: z.enum(["7d", "30d", "90d", "6m"]),
});
