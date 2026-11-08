import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Lightbulb, Plus } from "lucide-react";
import { CountBarChart } from "@/components/analytics/charts";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-controls";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { TrendBadge } from "@/components/ui/stat-card";
import { contentTakeaways } from "@/lib/calculations/content-insights";
import { comparePeriods } from "@/lib/calculations/trends";
import { CONTENT_TYPES, labelFor } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { buildReport } from "@/lib/services/report.service";
import { formatDate, formatNumber, formatPercent, todayISO } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Content Intelligence" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const r = await buildReport(supabase, { from: "2000-01-01", to: todayISO() });

  const q = (sp.q ?? "").trim().toLowerCase();
  const sort = ["published", "impressions", "engagement", "fit", "profile"].includes(sp.sort ?? "") ? (sp.sort as string) : "published";
  let rows = r.posts.filter((p) =>
    (!q || p.post.title.toLowerCase().includes(q) || p.post.topics.some((t) => t.toLowerCase().includes(q))) && (!sp.type || p.post.content_type === sp.type),
  );
  const key = (p: (typeof rows)[number]): number | null =>
    sort === "impressions" ? p.latest?.impressions ?? null : sort === "engagement" ? p.engagementRate : sort === "fit" ? p.fit?.score ?? null : sort === "profile" ? p.latest?.profile_activity ?? null : p.post.published_at ? Date.parse(p.post.published_at) : null;
  rows = [...rows].sort((a, b) => (key(b) ?? -Infinity) - (key(a) ?? -Infinity));

  const { takeaways, insufficient } = contentTakeaways(
    r.posts.map((p) => ({ title: p.post.title, topics: p.post.topics, contentType: p.post.content_type, fitScore: p.fit?.score ?? null, engagementRate: p.engagementRate, profileActivity: p.latest?.profile_activity ?? null })),
  );
  const compare = r.posts.filter((p) => p.engagementRate !== null || p.fit?.score != null).slice(0, 8).map((p) => ({ label: p.post.title.slice(0, 18), engagement_rate: p.engagementRate === null ? null : Number(p.engagementRate.toFixed(2)), audience_fit: p.fit?.score == null ? null : Number(p.fit.score.toFixed(1)) }));

  return (
    <>
      <PageHeader title="Content Intelligence" description="Which content reaches the audience you actually want — not just the biggest one." actions={<Link href="/content/new" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" aria-hidden /> Add post</Link>} />

      {r.posts.length === 0 ? (
        <EmptyState icon={FileText} title="No posts yet" description="Add a post, then record its performance by reporting period. Add demographics to see how well it reached your targets." action={<Link href="/content/new" className={buttonVariants()}>Add your first post</Link>} />
      ) : (
        <div className="space-y-6">
          <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Filter posts">
            <div><label htmlFor="q" className="sr-only">Search</label><Input id="q" name="q" placeholder="Search title or topic" defaultValue={sp.q ?? ""} className="w-56" /></div>
            <div><label htmlFor="type" className="sr-only">Type</label><Select id="type" name="type" defaultValue={sp.type ?? ""} className="w-44"><option value="">All types</option>{CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></div>
            <div><label htmlFor="sort" className="sr-only">Sort</label><Select id="sort" name="sort" defaultValue={sort} className="w-48"><option value="published">Newest first</option><option value="impressions">Impressions</option><option value="engagement">Engagement rate</option><option value="fit">Audience fit</option><option value="profile">Profile activity</option></Select></div>
            <button className={buttonVariants({ variant: "outline" })}>Apply</button>
          </form>

          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Posts and their latest performance</caption>
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="p-3">Post</th><th scope="col" className="p-3">Published</th><th scope="col" className="p-3 text-right">Impressions</th>
                <th scope="col" className="p-3 text-right">Engagement</th><th scope="col" className="p-3 text-right">Profile activity</th><th scope="col" className="p-3 text-right">Audience fit</th><th scope="col" className="p-3">Trend</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.post.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3"><Link href={`/content/${p.post.id}`} className="font-medium hover:underline">{p.post.title}</Link><p className="text-xs text-muted-foreground">{labelFor(CONTENT_TYPES, p.post.content_type)}{p.post.topics.length ? ` · ${p.post.topics.join(", ")}` : ""}</p></td>
                    <td className="p-3">{formatDate(p.post.published_at)}</td>
                    <td className="tabular p-3 text-right">{formatNumber(p.latest?.impressions)}</td>
                    <td className="tabular p-3 text-right">{formatPercent(p.engagementRate)}</td>
                    <td className="tabular p-3 text-right">{formatNumber(p.latest?.profile_activity)}</td>
                    <td className="tabular p-3 text-right">{p.fit?.score == null ? "—" : Math.round(p.fit.score)}</td>
                    <td className="p-3"><TrendBadge cmp={comparePeriods(p.engagementRate, p.previousEngagementRate)} /></td>
                  </tr>
                ))}
                {rows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No posts match these filters.</td></tr> : null}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Engagement vs audience fit</CardTitle><CardDescription>Engagement rate (%) and audience-fit score (0–100) per post. A high bar on one and not the other is the point.</CardDescription></CardHeader>
              <CardContent><CountBarChart data={compare} bars={[{ key: "engagement_rate", label: "Engagement rate %" }, { key: "audience_fit", label: "Audience fit", color: "#0f766e" }]} emptyText="Add post metrics and demographics to compare" summary="Engagement rate is by impressions. Audience fit exists only for posts with demographics." /></CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4" aria-hidden /> What your data suggests</CardTitle><CardDescription>Computed from your numbers — no AI, no guesses.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {takeaways.map((t) => <div key={t.text} className="rounded-md border p-3 text-sm"><p>{t.text}</p><p className="mt-1 text-xs text-muted-foreground">{t.basis}</p></div>)}
                {insufficient ? <Alert tone="info">{insufficient}</Alert> : null}
                <p className="text-xs italic text-muted-foreground">Engagement rate isn’t treated as a measure of audience quality, and no post is credited with causing a recruiter message unless you attribute it.</p>
              </CardContent></Card>
          </div>
        </div>
      )}
    </>
  );
}
