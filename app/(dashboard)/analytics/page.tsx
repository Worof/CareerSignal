import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Camera, Plus } from "lucide-react";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import { SOURCE_TYPES, labelFor, type RangeKey } from "@/lib/constants";
import { listSnapshots } from "@/lib/services/analytics.service";
import { formatDate, formatNumber, formatPercent, todayISO } from "@/lib/utils/format";
import { resolveRange } from "@/lib/utils/range";
import { deleteSnapshotAction } from "./actions";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const filtering = Boolean(sp.range);
  const resolved = resolveRange(sp, todayISO(), "6m");
  const snapshots = await listSnapshots(supabase, filtering ? resolved.range : undefined);
  const bySource = sp.type ? snapshots.filter((s) => s.source_type === sp.type) : snapshots;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every imported reporting period, with where each number came from."
        actions={<>
          <Link href="/analytics/uploads" className={buttonVariants({ variant: "outline", size: "sm" })}>Uploads</Link>
          <Link href="/analytics/upload" className={buttonVariants({ variant: "outline", size: "sm" })}><Camera className="h-4 w-4" aria-hidden /> Upload screenshot</Link>
          <Link href="/analytics/new" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" aria-hidden /> Add analytics</Link>
        </>}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <RangeFilter current={(filtering ? resolved.key : "6m") as RangeKey} from={resolved.range.from} to={resolved.range.to} extra={{ type: sp.type }} />
      </div>
      <nav aria-label="Filter by type" className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {[{ value: "", label: "All" }, ...SOURCE_TYPES].map((t) => (
          <Link key={t.value} href={`/analytics?${new URLSearchParams({ ...(sp.range ? { range: sp.range } : {}), ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}), ...(t.value ? { type: t.value } : {}) })}`}
            aria-current={(sp.type ?? "") === t.value ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${(sp.type ?? "") === t.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t.label}</Link>
        ))}
      </nav>

      {bySource.length === 0 ? (
        <EmptyState icon={BarChart3} title="No analytics imported yet" description="Add a reporting period by hand or upload a screenshot of your LinkedIn analytics." action={<Link href="/analytics/new" className={buttonVariants()}>Add analytics</Link>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Analytics snapshots</caption>
            <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="p-3">Period</th><th scope="col" className="p-3">Type</th>
              <th scope="col" className="p-3 text-right">Impressions</th><th scope="col" className="p-3 text-right">Reached</th><th scope="col" className="p-3 text-right">Profile views</th>
              <th scope="col" className="p-3 text-right">Eng. rate</th><th scope="col" className="p-3">Source</th><th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {bySource.map((s) => {
                const er = engagementRateByImpressions(s);
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3"><Link href={`/analytics/${s.id}`} className="font-medium hover:underline">{formatDate(s.reporting_period_start)} – {formatDate(s.reporting_period_end)}</Link></td>
                    <td className="p-3">{labelFor(SOURCE_TYPES, s.source_type)}</td>
                    <td className="tabular p-3 text-right">{formatNumber(s.impressions)}</td>
                    <td className="tabular p-3 text-right">{formatNumber(s.members_reached)}</td>
                    <td className="tabular p-3 text-right">{formatNumber(s.profile_views)}</td>
                    <td className="tabular p-3 text-right">{er.available ? formatPercent(er.value) : "—"}</td>
                    <td className="p-3"><Badge tone={s.data_source === "manual" ? "neutral" : "primary"}>{s.data_source.replace("_", " ")}</Badge></td>
                    <td className="p-3 text-right">
                      <ConfirmDelete iconOnly label="Delete snapshot" action={deleteSnapshotAction.bind(null, s.id, undefined)} title="Delete this snapshot?" description="This also deletes its audience segments and will change your dashboard totals. This can’t be undone." />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
