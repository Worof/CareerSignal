import type { SupabaseClient } from "@supabase/supabase-js";
import { AIError, completeJSON, getAIProvider } from "@/lib/ai";
import { collectNumbers, findUnsupportedNumbers } from "@/lib/ai/number-guard";
import { INSIGHT_PROMPT_VERSION, INSIGHT_SYSTEM } from "@/lib/ai/prompts";
import type { InsightType } from "@/lib/constants";
import type { Insight } from "@/lib/types/db";
import { insightOutputSchema } from "@/lib/validations/ai";
import { buildInsightInput, hasEnoughData } from "./insight-input";
import { buildReport } from "./report.service";
import type { DateRange } from "@/lib/calculations/trends";

export const INSIGHT_HOURLY_LIMIT = 10;

export async function listInsights(supabase: SupabaseClient, status: "active" | "archived" = "active"): Promise<Insight[]> {
  const { data, error } = await supabase.from("insights").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Failed to load insights: ${error.message}`);
  return (data ?? []) as Insight[];
}

export async function archiveInsight(supabase: SupabaseClient, id: string, archived = true) {
  return supabase.from("insights").update({ status: archived ? "archived" : "active" }).eq("id", id);
}

export async function deleteInsight(supabase: SupabaseClient, id: string) {
  return supabase.from("insights").delete().eq("id", id);
}

export type GenerateResult = { ok: true; id: string } | { ok: false; error: string };

/** Deterministic metrics are computed first; the model only explains them. Failures never affect the rest of the app. */
export async function generateInsight(
  supabase: SupabaseClient,
  userId: string,
  type: InsightType,
  range: DateRange,
): Promise<GenerateResult> {
  const provider = getAIProvider();
  if (!provider) {
    return { ok: false, error: "AI insights are not configured. Add an AI provider key to enable them — the rest of CareerSignal works without it." };
  }

  // DB-backed rate limit (works across serverless instances).
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from("insights").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= INSIGHT_HOURLY_LIMIT) {
    return { ok: false, error: `You've reached the limit of ${INSIGHT_HOURLY_LIMIT} insights per hour. Please try again later.` };
  }

  const report = await buildReport(supabase, range);
  const enough = hasEnoughData(report);
  if (!enough.ok) return { ok: false, error: enough.reason };

  const input = buildInsightInput(type, report);
  const allowed = collectNumbers(input);

  try {
    const out = await completeJSON(
      provider,
      { system: INSIGHT_SYSTEM, user: `Input data:\n${JSON.stringify(input)}`, maxTokens: 1200 },
      insightOutputSchema,
      (v) => {
        const bad = findUnsupportedNumbers([v.title, v.analysis, v.recommendation ?? "", ...v.evidence.map((e) => e.observation)].join(" "), allowed);
        return bad.length ? `it contained numbers that are not in the input data: ${bad.slice(0, 5).join(", ")}. Use only supplied numbers.` : null;
      },
    );

    const { data, error } = await supabase
      .from("insights")
      .insert({
        user_id: userId,
        insight_type: type,
        title: out.title,
        description: out.analysis,
        recommendation: out.recommendation,
        evidence: {
          ai_evidence: out.evidence,
          is_general_recommendation: out.is_general_recommendation,
          input_summary: input, // exactly what the model saw — no contact names, notes or files
          snapshot_ids: report.currentSnapshots.map((s) => s.id),
          previous_snapshot_ids: report.previousSnapshots.map((s) => s.id),
        },
        model_name: `${provider.name}:${provider.model}`,
        prompt_version: INSIGHT_PROMPT_VERSION,
        reporting_period_start: range.from,
        reporting_period_end: range.to,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "The insight was generated but could not be saved. Please try again." };
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    if (e instanceof AIError) {
      return { ok: false, error: e.kind === "timeout" ? "The AI provider took too long to respond. Try again in a moment." : e.message };
    }
    return { ok: false, error: "Something went wrong while generating the insight." };
  }
}
