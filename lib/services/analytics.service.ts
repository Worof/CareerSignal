import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsSnapshot } from "@/lib/types/db";
import type { SnapshotInput } from "@/lib/validations/analytics";
import type { DateRange } from "@/lib/calculations/trends";

export async function listSnapshots(supabase: SupabaseClient, range?: DateRange): Promise<AnalyticsSnapshot[]> {
  let q = supabase.from("analytics_snapshots").select("*").order("reporting_period_end", { ascending: false });
  if (range) q = q.gte("reporting_period_end", range.from).lte("reporting_period_end", range.to);
  const { data, error } = await q.limit(500);
  if (error) throw new Error(`Failed to load analytics: ${error.message}`);
  return (data ?? []) as AnalyticsSnapshot[];
}

export async function getSnapshot(supabase: SupabaseClient, id: string): Promise<AnalyticsSnapshot | null> {
  const { data, error } = await supabase.from("analytics_snapshots").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load snapshot: ${error.message}`);
  return data as AnalyticsSnapshot | null;
}

export async function createSnapshot(
  supabase: SupabaseClient,
  userId: string,
  input: SnapshotInput,
  opts: { dataSource?: "manual" | "screenshot" | "csv" | "linkedin_api"; uploadJobId?: string | null } = {},
) {
  return supabase
    .from("analytics_snapshots")
    .insert({ ...input, user_id: userId, data_source: opts.dataSource ?? "manual", upload_job_id: opts.uploadJobId ?? null })
    .select("id")
    .single();
}

export async function updateSnapshot(supabase: SupabaseClient, id: string, input: SnapshotInput) {
  return supabase.from("analytics_snapshots").update(input).eq("id", id).select("id").single();
}

export async function deleteSnapshot(supabase: SupabaseClient, id: string) {
  return supabase.from("analytics_snapshots").delete().eq("id", id);
}
