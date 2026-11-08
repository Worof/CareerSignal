import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Opportunity, OpportunityEvent } from "@/lib/types/db";
import type { opportunitySchema } from "@/lib/validations/opportunities";

export type OpportunityInput = z.output<typeof opportunitySchema>;

export interface OpportunityFilters {
  status?: string;
  attribution?: string;
  type?: string;
  from?: string;
  to?: string;
}

export async function listOpportunities(supabase: SupabaseClient, f: OpportunityFilters = {}): Promise<Opportunity[]> {
  let q = supabase.from("opportunities").select("*").order("received_at", { ascending: false });
  if (f.status) q = q.eq("status", f.status);
  if (f.attribution) q = q.eq("attribution_source", f.attribution);
  if (f.type) q = q.eq("opportunity_type", f.type);
  if (f.from) q = q.gte("received_at", f.from);
  if (f.to) q = q.lte("received_at", f.to);
  const { data, error } = await q.limit(1000);
  if (error) throw new Error(`Failed to load opportunities: ${error.message}`);
  return (data ?? []) as Opportunity[];
}

export async function getOpportunity(supabase: SupabaseClient, id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load opportunity: ${error.message}`);
  return data as Opportunity | null;
}

export async function listOpportunityEvents(supabase: SupabaseClient, id: string): Promise<OpportunityEvent[]> {
  const { data, error } = await supabase
    .from("opportunity_events")
    .select("id, opportunity_id, event_type, from_status, to_status, created_at")
    .eq("opportunity_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load history: ${error.message}`);
  return (data ?? []) as OpportunityEvent[];
}

export async function createOpportunity(supabase: SupabaseClient, userId: string, input: OpportunityInput) {
  return supabase.from("opportunities").insert({ ...input, user_id: userId }).select("id").single();
}

export async function updateOpportunity(supabase: SupabaseClient, id: string, input: OpportunityInput) {
  return supabase.from("opportunities").update(input).eq("id", id).select("id").single();
}

export async function updateOpportunityStatus(supabase: SupabaseClient, id: string, status: string) {
  return supabase
    .from("opportunities")
    .update({ status, last_interaction_at: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .select("id")
    .single();
}

export async function deleteOpportunity(supabase: SupabaseClient, id: string) {
  return supabase.from("opportunities").delete().eq("id", id);
}
