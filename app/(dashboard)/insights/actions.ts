"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { INSIGHT_TYPES, RANGE_OPTIONS } from "@/lib/constants";
import { archiveInsight, deleteInsight, generateInsight } from "@/lib/services/insight.service";
import { dbErrorMessage, fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { todayISO } from "@/lib/utils/format";
import { resolveRange } from "@/lib/utils/range";
import { uuid } from "@/lib/validations/common";

const generateSchema = z.object({
  insight_type: z.enum(INSIGHT_TYPES.map((t) => t.value) as [string, ...string[]]),
  range: z.enum(RANGE_OPTIONS.map((r) => r.value) as [string, ...string[]]),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function generateInsightAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(generateSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { range } = resolveRange({ range: parsed.data.range, from: parsed.data.from, to: parsed.data.to }, todayISO());
  const res = await generateInsight(supabase, user.id, parsed.data.insight_type as (typeof INSIGHT_TYPES)[number]["value"], range);
  if (!res.ok) return fail(res.error);
  revalidatePath("/insights");
  return succeed("Insight generated.", { id: res.id });
}

export async function archiveInsightAction(id: string, archived: boolean): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await archiveInsight(supabase, id, archived);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/insights");
  return succeed(archived ? "Insight archived." : "Insight restored.");
}

export async function deleteInsightAction(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deleteInsight(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/insights");
  return succeed("Insight deleted.");
}
