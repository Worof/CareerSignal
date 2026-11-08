import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAudienceFit,
  type AudienceFitResult,
  type SegmentInput,
  type TargetsByDimension,
} from "@/lib/calculations/audience-fit";
import type { AudienceSegment, CareerGoal } from "@/lib/types/db";
import type { SegmentInput as SegmentFormInput } from "@/lib/validations/analytics";

export function goalToTargets(goal: CareerGoal | null): TargetsByDimension {
  return {
    job_title: goal?.target_job_titles ?? [],
    industry: goal?.target_industries ?? [],
    company: goal?.target_companies ?? [],
    seniority: goal?.target_seniority ?? [],
    location: goal?.target_locations ?? [],
  };
}

export function toSegmentInputs(segments: AudienceSegment[]): SegmentInput[] {
  return segments.map((s) => ({
    dimension: s.dimension,
    segment_name: s.segment_name,
    percentage: s.percentage === null ? null : Number(s.percentage),
    member_count: s.member_count,
  }));
}

/** Pure wrapper so UI + AI services share exactly one scoring path. */
export function computeAudienceFit(segments: AudienceSegment[], goal: CareerGoal | null): AudienceFitResult {
  return calculateAudienceFit({
    segments: toSegmentInputs(segments),
    targets: goalToTargets(goal),
    weights: goal?.scoring_weights,
    synonyms: goal?.synonyms ?? {},
  });
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K | null): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const i of items) {
    const k = key(i);
    if (k === null) continue;
    (out[k] ??= []).push(i);
  }
  return out;
}

export async function listSegmentsForSnapshots(supabase: SupabaseClient, snapshotIds: string[]): Promise<AudienceSegment[]> {
  if (snapshotIds.length === 0) return [];
  const { data, error } = await supabase.from("audience_segments").select("*").in("analytics_snapshot_id", snapshotIds);
  if (error) throw new Error(`Failed to load audience segments: ${error.message}`);
  return (data ?? []) as AudienceSegment[];
}

export async function listSegmentsForPosts(supabase: SupabaseClient, postIds: string[]): Promise<AudienceSegment[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase.from("audience_segments").select("*").in("post_id", postIds);
  if (error) throw new Error(`Failed to load post audience: ${error.message}`);
  return (data ?? []) as AudienceSegment[];
}

export async function createSegment(supabase: SupabaseClient, userId: string, input: SegmentFormInput) {
  return supabase.from("audience_segments").insert({
    user_id: userId,
    analytics_snapshot_id: input.snapshot_id ?? null,
    post_id: input.post_id ?? null,
    dimension: input.dimension,
    segment_name: input.segment_name,
    percentage: input.percentage,
    member_count: input.member_count,
    is_estimated: input.is_estimated,
    data_source: "manual",
  });
}

export async function deleteSegment(supabase: SupabaseClient, id: string) {
  return supabase.from("audience_segments").delete().eq("id", id);
}
