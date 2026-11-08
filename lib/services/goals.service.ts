import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_WEIGHTS } from "@/lib/constants";
import type { CareerGoal, Profile, UserPreferences } from "@/lib/types/db";
import type { GoalPatch } from "@/lib/validations/goals";

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data as Profile | null;
}

export async function getGoal(supabase: SupabaseClient, userId: string): Promise<CareerGoal | null> {
  const { data, error } = await supabase.from("career_goals").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Failed to load career goals: ${error.message}`);
  return data as CareerGoal | null;
}

export async function getPreferences(supabase: SupabaseClient, userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Failed to load preferences: ${error.message}`);
  return data as UserPreferences | null;
}

/**
 * Idempotent save of onboarding progress. One goal row per user (unique constraint), so a
 * resumed or repeated onboarding can never create duplicates.
 */
export async function saveGoalPatch(supabase: SupabaseClient, userId: string, patch: GoalPatch) {
  const { step, complete, goal_types, ...targets } = patch;

  const row: Record<string, unknown> = { user_id: userId };
  if (goal_types) row.goal_types = goal_types;
  if (targets.target_job_titles) row.target_job_titles = targets.target_job_titles;
  if (targets.target_industries) row.target_industries = targets.target_industries;
  if (targets.target_companies) row.target_companies = targets.target_companies;
  if (targets.target_seniority) row.target_seniority = targets.target_seniority;
  if (targets.target_locations) row.target_locations = targets.target_locations;

  const goalRes = await supabase.from("career_goals").upsert(row, { onConflict: "user_id" }).select().single();
  if (goalRes.error) return { error: goalRes.error };

  const profilePatch: Record<string, unknown> = {};
  if (typeof step === "number") profilePatch.onboarding_step = step;
  if (complete) {
    profilePatch.onboarding_completed = true;
    profilePatch.onboarding_step = 7;
  }
  if (Object.keys(profilePatch).length > 0) {
    const p = await supabase.from("profiles").update(profilePatch).eq("id", userId);
    if (p.error) return { error: p.error };
  }
  return { goal: goalRes.data as CareerGoal };
}

export async function deleteGoal(supabase: SupabaseClient, userId: string) {
  return supabase.from("career_goals").delete().eq("user_id", userId);
}

export function weightsOrDefault(goal: CareerGoal | null) {
  return goal?.scoring_weights ?? DEFAULT_WEIGHTS;
}
