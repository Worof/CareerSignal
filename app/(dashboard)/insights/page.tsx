import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ArchiveButton } from "@/components/insights/archive-button";
import { GenerateInsightForm } from "@/components/insights/generate-form";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { isAIConfigured } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { INSIGHT_TYPES, labelFor } from "@/lib/constants";
import { getProfile } from "@/lib/services/goals.service";
import { listInsights } from "@/lib/services/insight.service";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { deleteInsightAction } from "./actions";

export const metadata: Metadata = { title: "AI Insights" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const archived = sp.view === "archived";
  const { supabase, user } = await requireUser();
  const [insights, profile] = await Promise.all([listInsights(supabase, archived ? "archived" : "active"), getProfile(supabase, user.id)]);
  const ai = isAIConfigured();

  return (
    <>
      <PageHeader title="AI Insights" description="Plain-language interpretation of your numbers. The maths is done by deterministic code; AI only explains it." />
      {!ai ? <Alert tone="info" title="AI insights are switched off" className="mb-4">Add <code>ANTHROPIC_API_KEY</code> to enable them. Everything else in CareerSignal works without it.</Alert> : null}
      <Card className="mb-6"><CardContent className="pt-5">
        <GenerateInsightForm disabled={!ai} />
        <p className="mt-3 text-xs text-muted-foreground">Only aggregate numbers and your target lists are sent to the AI provider — never contact names, notes, post text, URLs or screenshots.</p>
      </CardContent></Card>

      <nav aria-label="Insight view" className="mb-4 flex gap-2 text-sm">
        <Link href="/insights" aria-current={!archived ? "page" : undefined} className={`rounded-full border px-3 py-1 ${!archived ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Active</Link>
        <Link href="/insights?view=archived" aria-current={archived ? "page" : undefined} className={`rounded-full border px-3 py-1 ${archived ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Archived</Link>
      </nav>

      {insights.length === 0 ? (
        <EmptyState icon={Sparkles} title={archived ? "No archived insights" : "No insights yet"} description={archived ? "Insights you archive appear here." : "Generate your first insight once you’ve imported some analytics."} />
      ) : (
        <div className="space-y-4">
          {insights.map((i) => {
            const ev = i.evidence as { ai_evidence?: Array<{ metric: string; observation: string }>; is_general_recommendation?: boolean };
            return (
              <Card key={i.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="primary">{labelFor(INSIGHT_TYPES, i.insight_type)}</Badge>
                    {i.reporting_period_start ? <Badge>{formatDate(i.reporting_period_start)} – {formatDate(i.reporting_period_end)}</Badge> : null}</div>
                  <CardTitle className="pt-1 text-xl">{i.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed">{i.description}</p>
                  {i.recommendation ? (
                    <div className="rounded-md bg-primary/5 p-3 text-sm"><p className="font-medium">Recommendation {ev.is_general_recommendation ? <Badge className="ml-1">general advice</Badge> : null}</p><p className="mt-1">{i.recommendation}</p></div>
                  ) : null}
                  {ev.ai_evidence?.length ? (
                    <div><p className="mb-1 text-sm font-medium">Evidence</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{ev.ai_evidence.map((e) => <li key={e.metric + e.observation}><span className="font-medium text-foreground">{e.metric}:</span> {e.observation}</li>)}</ul></div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Generated {formatDateTime(i.created_at, profile?.timezone)} · {i.model_name} · prompt {i.prompt_version}</p>
                    <div className="flex gap-2"><ArchiveButton id={i.id} archived={archived} /><ConfirmDelete action={deleteInsightAction.bind(null, i.id)} title="Delete this insight?" description="It will be permanently deleted." /></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
