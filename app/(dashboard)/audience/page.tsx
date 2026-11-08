import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";
import { DimensionCard } from "@/components/audience/dimension-card";
import { FitCard } from "@/components/audience/fit-card";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { DIMENSIONS, type Dimension } from "@/lib/constants";
import { goalToTargets } from "@/lib/services/audience.service";
import { buildReport } from "@/lib/services/report.service";
import { formatDate, todayISO } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Audience Intelligence" };

export default async function AudiencePage({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const r = await buildReport(supabase, { from: "2000-01-01", to: todayISO() });
  const series = r.fitSeries;
  const selected = series.find((p) => p.snapshotId === sp.snapshot) ?? series[series.length - 1] ?? null;
  const targets = goalToTargets(r.goal);
  const noTargets = DIMENSIONS.every((d) => targets[d].length === 0);

  const historyFor = (d: Dimension) =>
    series.slice(-12).map((p) => {
      const dr = p.result.dimensions[d];
      return { label: format(parseISO(p.periodEnd), "MMM d"), match: dr.usable && dr.matchRate !== null ? Number((dr.matchRate * 100).toFixed(1)) : null };
    });

  return (
    <>
      <PageHeader title="Audience Intelligence" description="How closely the audience LinkedIn can identify matches the people you want to reach." actions={<Link href="/onboarding?edit=1" className={buttonVariants({ variant: "outline", size: "sm" })}>Edit targets</Link>} />
      <Alert tone="info" className="mb-6" title="What this analysis covers">
        LinkedIn audience data may be aggregated, incomplete or privacy-limited. This page analyses the identifiable audience data you’ve provided — not necessarily everyone who saw your content — and never invents demographics.
      </Alert>

      {noTargets ? <Alert tone="warning" className="mb-6" title="No targets set">Define target roles, industries or companies to compare your audience against. <Link href="/onboarding?edit=1" className="text-primary underline">Set targets</Link></Alert> : null}

      {!selected ? (
        <EmptyState icon={Users} title="No audience demographics yet" description="Add demographics to an analytics snapshot (by hand or from a screenshot) to see how your audience compares with your targets."
          action={<Link href="/analytics" className={buttonVariants()}>Go to analytics</Link>} />
      ) : (
        <div className="space-y-6">
          <nav aria-label="Choose reporting period" className="flex flex-wrap gap-1.5 text-sm">
            {series.slice(-12).reverse().map((p) => (
              <Link key={p.snapshotId} href={`/audience?snapshot=${p.snapshotId}`} aria-current={p.snapshotId === selected.snapshotId ? "page" : undefined}
                className={`rounded-full border px-3 py-1 ${p.snapshotId === selected.snapshotId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {formatDate(p.periodEnd)}{p.score !== null ? ` · ${Math.round(p.score)}` : ""}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">Each period is analysed on its own — demographics from different periods are never merged.</p>

          <FitCard result={selected.result} periodLabel={`Snapshot ending ${formatDate(selected.periodEnd)}`} />

          <div className="grid gap-4 lg:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <DimensionCard key={d} result={selected.result.dimensions[d]} targets={targets[d]} history={historyFor(d)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
