import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { BarChart3, Plus } from "lucide-react";
import { FitCard } from "@/components/audience/fit-card";
import { CompositionChart, CountBarChart, TimeSeriesChart } from "@/components/analytics/charts";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { countByStatus, countByType, opportunitiesByMonth } from "@/lib/calculations/aggregate";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import { qualifiedOpportunitiesPer1000 } from "@/lib/calculations/conversion";
import { comparePeriods } from "@/lib/calculations/trends";
import { DIMENSION_LABELS, OPPORTUNITY_STATUSES, VISIBILITY_SOURCE_TYPES, type RangeKey } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getPreferences } from "@/lib/services/goals.service";
import { buildReport } from "@/lib/services/report.service";
import { formatDate, formatNumber, formatPercent, todayISO } from "@/lib/utils/format";
import { resolveRange } from "@/lib/utils/range";

export const metadata: Metadata = { title: "Overview" };

const lbl = (iso: string) => format(parseISO(iso), "MMM d");

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const prefs = await getPreferences(supabase, user.id);
  const { key, range } = resolveRange(sp, todayISO(), (prefs?.preferred_reporting_period as RangeKey) ?? "30d");
  const r = await buildReport(supabase, range);

  const hasAnything = r.snapshots.length > 0 || r.opportunities.length > 0 || r.posts.length > 0;
  const cmp = (cur: number | null, prev: number | null) => comparePeriods(cur, prev);

  // ── chart data (history up to the selected end date, last 12 visibility snapshots) ──
  const visSnaps = r.snapshots
    .filter((s) => (VISIBILITY_SOURCE_TYPES as string[]).includes(s.source_type))
    .sort((a, b) => a.reporting_period_end.localeCompare(b.reporting_period_end))
    .slice(-12);
  const visData = visSnaps.map((s) => ({ label: lbl(s.reporting_period_end), impressions: s.impressions, members_reached: s.members_reached }));
  const engData = visSnaps.map((s) => {
    const e = engagementRateByImpressions(s);
    return { label: lbl(s.reporting_period_end), engagement_rate: e.available ? Number(e.value.toFixed(2)) : null };
  });
  const fitData = r.fitSeries.slice(-12).map((p) => ({ label: lbl(p.periodEnd), fit: p.score === null ? null : Number(p.score.toFixed(1)) }));
  const oppData = opportunitiesByMonth(r.opportunities).slice(-12).map((m) => ({ label: m.month, total: m.count, relevant: m.relevant }));
  const statusCounts = countByStatus(r.currentOpps.length > 0 ? r.currentOpps : r.opportunities);
  const pipelineData = OPPORTUNITY_STATUSES.map((s) => ({ label: s.label, count: statusCounts[s.value] ?? 0 })).filter((d) => d.count > 0);

  const jobDim = r.fit?.result.dimensions.job_title;
  const compData = (jobDim?.segments ?? []).slice().sort((a, b) => b.weight - a.weight).slice(0, 8).map((s) => ({ name: s.segment, value: s.weight, matched: s.matched }));

  const first = (arr: Array<number | null>) => arr.find((v) => v !== null) ?? null;
  const last = (arr: Array<number | null>) => [...arr].reverse().find((v) => v !== null) ?? null;
  const trendSummary = (name: string, arr: Array<number | null>, f: (v: number | null) => string) =>
    arr.filter((v) => v !== null).length < 2 ? `${name}: need at least two reporting periods to show a trend.` : `${name}: ${f(first(arr))} → ${f(last(arr))} across ${arr.length} periods.`;

  // ── top posts ──
  const sort = sp.sort === "engagement" || sp.sort === "impressions" || sp.sort === "profile" ? sp.sort : "fit";
  const keyFor = (p: (typeof r.posts)[number]) =>
    sort === "fit" ? p.fit?.score ?? null : sort === "engagement" ? p.engagementRate : sort === "impressions" ? p.latest?.impressions ?? null : p.latest?.profile_activity ?? null;
  const topPosts = r.posts.filter((p) => keyFor(p) !== null).sort((a, b) => (keyFor(b) as number) - (keyFor(a) as number)).slice(0, 5);

  const conv = qualifiedOpportunitiesPer1000({ membersReached: r.qualifiedPer1000.membersReached, qualifiedAttributedOpportunities: r.qualifiedPer1000.qualified, periodsAligned: r.qualifiedPer1000.periodsAligned });
  const opp = (types: string[]) => cmp(countByType(r.currentOpps, types), countByType(r.previousOpps, types));
  const oppCount = (types: string[]) => formatNumber(countByType(r.currentOpps, types));
  const measuredNote = "Measured — from imported LinkedIn analytics.";
  const manualNote = "Manually entered by you.";
  const dim = (d: keyof typeof DIMENSION_LABELS) => r.fit?.result.dimensions[d];
  const matchRate = (d: keyof typeof DIMENSION_LABELS) => { const x = dim(d); return x?.usable && x.matchRate !== null ? formatPercent(x.matchRate * 100, 0) : "—"; };
  const matchNote = (d: keyof typeof DIMENSION_LABELS) => dim(d)?.reason ?? "Share of identifiable audience matching your targets.";

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${formatDate(range.from)} – ${formatDate(range.to)}, compared with the equivalent ${formatDate(r.previous.from)} – ${formatDate(r.previous.to)}.`}
        actions={<Link href="/analytics/new" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" aria-hidden /> Add analytics</Link>}
      />
      <div className="mb-6"><RangeFilter current={key} from={range.from} to={range.to} /></div>

      {!hasAnything ? (
        <EmptyState
          icon={BarChart3}
          title="Your dashboard is waiting for data"
          description="CareerSignal never shows made-up numbers. Add your LinkedIn analytics by hand or upload a screenshot to see visibility, audience fit and opportunities here."
          action={<div className="flex gap-2"><Link href="/analytics/new" className={buttonVariants()}>Enter analytics</Link><Link href="/analytics/upload" className={buttonVariants({ variant: "outline" })}>Upload screenshot</Link></div>}
        />
      ) : (
        <div className="space-y-10">
          {/* A — Visibility */}
          <section aria-labelledby="sec-visibility" className="space-y-3">
            <h2 id="sec-visibility" className="text-xl font-semibold">Visibility</h2>
            {r.totals.snapshotCount === 0 ? <p className="text-sm text-muted-foreground">No profile analytics were reported in this period, so totals are unavailable (not zero).</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard title="Impressions" value={formatNumber(r.totals.impressions)} cmp={cmp(r.totals.impressions, r.prevTotals.impressions)} explanation={measuredNote} tooltip="Sum of impressions across profile-analytics snapshots whose reporting period ends in the selected range." />
              <StatCard title="Members reached" value={formatNumber(r.totals.members_reached)} cmp={cmp(r.totals.members_reached, r.prevTotals.members_reached)} explanation={measuredNote} tooltip="Unique members reached. Summed across snapshots, so overlapping periods can double count the same people." />
              <StatCard title="Profile views" value={formatNumber(r.totals.profile_views)} cmp={cmp(r.totals.profile_views, r.prevTotals.profile_views)} explanation={measuredNote} />
              <StatCard title="Search appearances" value={formatNumber(r.totals.search_appearances)} cmp={cmp(r.totals.search_appearances, r.prevTotals.search_appearances)} explanation={measuredNote} />
              <StatCard title="Follower growth" value={formatNumber(r.totals.follower_growth)} cmp={cmp(r.totals.follower_growth, r.prevTotals.follower_growth)} explanation={measuredNote} footnote={r.totals.total_followers !== null ? `${formatNumber(r.totals.total_followers)} followers in total` : undefined} />
            </div>
          </section>

          {/* B — Audience fit */}
          <section aria-labelledby="sec-fit" className="space-y-3">
            <h2 id="sec-fit" className="text-xl font-semibold">Audience fit</h2>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <FitCard result={r.fit?.result ?? null} periodLabel={r.fit ? `Based on the snapshot ending ${formatDate(r.fit.periodEnd)}` : undefined} />
              <div className="grid grid-cols-2 gap-3">
                {(["job_title", "industry", "company", "seniority", "location"] as const).map((d) => (
                  <StatCard key={d} title={`${DIMENSION_LABELS[d]} match`} value={matchRate(d)} explanation={matchNote(d)} />
                ))}
                <StatCard title="Score vs previous" value={r.fit?.score == null ? "—" : String(Math.round(r.fit.score))} cmp={cmp(r.fit?.score ?? null, r.previousFit?.score ?? null)} explanation="Latest fit in range vs latest in the previous period." />
              </div>
            </div>
          </section>

          {/* C — Professional intent */}
          <section aria-labelledby="sec-intent" className="space-y-3">
            <h2 id="sec-intent" className="text-xl font-semibold">Professional intent</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard title="Profile views" value={formatNumber(r.totals.profile_views)} cmp={cmp(r.totals.profile_views, r.prevTotals.profile_views)} explanation={measuredNote} footnote="Not filtered by relevance — LinkedIn doesn’t provide that." />
              <StatCard title="Search appearances" value={formatNumber(r.totals.search_appearances)} cmp={cmp(r.totals.search_appearances, r.prevTotals.search_appearances)} explanation={measuredNote} />
              <StatCard title="Recruiter & HR interactions" value={oppCount(["recruiter_inquiry", "hr_contact"])} cmp={opp(["recruiter_inquiry", "hr_contact"])} explanation={manualNote} />
              <StatCard title="Hiring-manager interactions" value={oppCount(["hiring_manager_contact"])} cmp={opp(["hiring_manager_contact"])} explanation={manualNote} />
              <StatCard title="Relevant connection requests" value={oppCount(["connection_request"])} cmp={opp(["connection_request"])} explanation={manualNote} />
            </div>
          </section>

          {/* D — Career outcomes */}
          <section aria-labelledby="sec-outcomes" className="space-y-3">
            <h2 id="sec-outcomes" className="flex items-center gap-2 text-xl font-semibold">Career outcomes <Badge>Manually entered</Badge></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard title="Recruiter inquiries" value={oppCount(["recruiter_inquiry"])} cmp={opp(["recruiter_inquiry"])} />
              <StatCard title="Interview invitations" value={oppCount(["interview_invitation"])} cmp={opp(["interview_invitation"])} />
              <StatCard title="Referrals" value={oppCount(["referral"])} cmp={opp(["referral"])} />
              <StatCard title="Networking conversations" value={oppCount(["networking_conversation"])} cmp={opp(["networking_conversation"])} />
              <StatCard title="Job offers" value={oppCount(["job_offer"])} cmp={opp(["job_offer"])} />
            </div>
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Qualified opportunities per 1,000 members reached</p>
                  <p className="text-xs text-muted-foreground">Observed attribution — not proof that your content caused them.</p>
                </div>
                <p className="tabular font-serif text-3xl font-semibold">{conv.available ? conv.value.toFixed(2) : "—"}</p>
              </div>
              {!conv.available ? <p className="mt-2 text-xs text-muted-foreground">Unavailable: {conv.reason}. Needs members reached, relevant opportunities attributed to LinkedIn, and aligned periods.</p> : null}
            </Card>
          </section>

          {/* Charts */}
          <section aria-labelledby="sec-trends" className="space-y-3">
            <h2 id="sec-trends" className="text-xl font-semibold">Trends</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Visibility over time</CardTitle><CardDescription>Impressions and members reached per reporting period</CardDescription></CardHeader><CardContent>
                <TimeSeriesChart data={visData} series={[{ key: "impressions", label: "Impressions" }, { key: "members_reached", label: "Members reached", dashed: true }]} summary={trendSummary("Impressions", visData.map((d) => d.impressions), (v) => formatNumber(v))} />
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Engagement over time</CardTitle><CardDescription>Engagement rate by impressions</CardDescription></CardHeader><CardContent>
                <TimeSeriesChart data={engData} series={[{ key: "engagement_rate", label: "Engagement rate" }]} yFormat="percent" summary={trendSummary("Engagement rate", engData.map((d) => d.engagement_rate), (v) => formatPercent(v, 1))} />
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Audience-fit trend</CardTitle><CardDescription>Score for each snapshot that has demographics</CardDescription></CardHeader><CardContent>
                <TimeSeriesChart data={fitData} series={[{ key: "fit", label: "Audience fit", color: "#0f766e" }]} summary={trendSummary("Audience fit", fitData.map((d) => d.fit), (v) => (v === null ? "—" : v.toFixed(0)))} emptyText="Add audience demographics to see this trend" />
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Professional opportunities over time</CardTitle><CardDescription>Recorded per month, all vs relevant</CardDescription></CardHeader><CardContent>
                <CountBarChart data={oppData} bars={[{ key: "total", label: "All" }, { key: "relevant", label: "Relevant", color: "#0f766e" }]} summary={oppData.length ? `${r.opportunities.length} opportunities recorded in total.` : undefined} emptyText="Record opportunities to see this chart" />
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Target vs current audience</CardTitle><CardDescription>Job titles in your latest audience data</CardDescription></CardHeader><CardContent>
                <CompositionChart data={compData} unit={jobDim?.unit === "member_count" ? "members" : "%"} summary={jobDim?.usable ? `${formatPercent((jobDim.matchRate ?? 0) * 100, 0)} of the listed audience matches your target titles.` : jobDim?.reason ?? undefined} />
                <Link href="/audience" className="mt-2 inline-block text-xs text-primary hover:underline">Explore all dimensions →</Link>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Career opportunity pipeline</CardTitle><CardDescription>Opportunities by status</CardDescription></CardHeader><CardContent>
                <CountBarChart data={pipelineData} bars={[{ key: "count", label: "Opportunities" }]} horizontal summary={pipelineData.length ? pipelineData.map((d) => `${d.label}: ${d.count}`).join(" · ") : undefined} emptyText="No opportunities yet" />
              </CardContent></Card>
            </div>
          </section>

          {/* Top posts */}
          <section aria-labelledby="sec-posts" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="sec-posts" className="text-xl font-semibold">Top-performing posts</h2>
              <form method="get" className="flex items-center gap-2 text-sm">
                <input type="hidden" name="range" value={key} />
                {key === "custom" ? <><input type="hidden" name="from" value={range.from} /><input type="hidden" name="to" value={range.to} /></> : null}
                <label htmlFor="sort" className="text-muted-foreground">Ranked by</label>
                <select id="sort" name="sort" defaultValue={sort} className="h-9 rounded-md border border-input bg-card px-2">
                  <option value="fit">Audience fit</option><option value="engagement">Engagement rate</option><option value="impressions">Impressions</option><option value="profile">Profile activity</option>
                </select>
                <button className={buttonVariants({ variant: "outline", size: "sm" })}>Apply</button>
              </form>
            </div>
            {topPosts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No posts have data for this ranking yet. {sort === "fit" ? "Per-post audience fit needs demographics added to a post." : ""}</p>
            ) : (
              <Card><ul className="divide-y">
                {topPosts.map((p) => (
                  <li key={p.post.id} className="flex items-center justify-between gap-3 p-4">
                    <Link href={`/content/${p.post.id}`} className="min-w-0 truncate font-medium hover:underline">{p.post.title}</Link>
                    <span className="tabular shrink-0 text-sm text-muted-foreground">
                      {sort === "fit" ? `Fit ${Math.round(keyFor(p) as number)}` : sort === "engagement" ? formatPercent(keyFor(p), 1) : formatNumber(keyFor(p))}
                    </span>
                  </li>
                ))}
              </ul></Card>
            )}
          </section>
        </div>
      )}
    </>
  );
}
