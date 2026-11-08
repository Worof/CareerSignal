"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveGoalPatch } from "@/lib/services/goals.service";
import { dbErrorMessage, fail, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { goalPatchSchema } from "@/lib/validations/goals";

/** Persists one onboarding step. Idempotent: the unique(user_id) constraint prevents duplicate goal rows. */
export async function saveOnboardingAction(input: unknown): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(goalPatchSchema, input);
  if (!parsed.ok) return parsed.state;
  const res = await saveGoalPatch(supabase, user.id, parsed.data);
  if ("error" in res && res.error) return fail(dbErrorMessage(res.error));
  revalidatePath("/", "layout");
  return succeed(parsed.data.complete ? "Your career objectives are saved." : undefined);
}
