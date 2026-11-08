import { z } from "zod";
import { ATTRIBUTION_SOURCES, OPPORTUNITY_STATUSES, OPPORTUNITY_TYPES } from "@/lib/constants";
import { checkbox, isoDate, nullableIsoDate, nullableText } from "./common";

const types = OPPORTUNITY_TYPES.map((t) => t.value) as [string, ...string[]];
const statuses = OPPORTUNITY_STATUSES.map((t) => t.value) as [string, ...string[]];
const attributions = ATTRIBUTION_SOURCES.map((t) => t.value) as [string, ...string[]];

export const opportunitySchema = z.object({
  company_name: z.string().trim().min(1, "Enter a company").max(200),
  contact_name: nullableText(200),
  contact_role: nullableText(200),
  opportunity_type: z.enum(types),
  related_job_title: nullableText(200),
  received_at: isoDate,
  source: nullableText(200),
  attribution_source: z.enum(attributions),
  status: z.enum(statuses),
  is_relevant: checkbox,
  notes: nullableText(5000),
  last_interaction_at: nullableIsoDate,
  outcome_at: nullableIsoDate,
});

export const statusSchema = z.object({ status: z.enum(statuses) });
