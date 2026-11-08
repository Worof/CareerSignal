import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SegmentForm } from "@/components/analytics/segment-form";
import { SnapshotForm } from "@/components/analytics/snapshot-form";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Badge, Alert, PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import { DIMENSIONS, DIMENSION_LABELS, SOURCE_TYPES, labelFor } from "@/lib/constants";
import { getSnapshot } from "@/lib/services/analytics.service";
import { listSegmentsForSnapshots } from "@/lib/services/audience.service";
import { uuid } from "@/lib/validations/common";
import { formatDate, formatPercent } from "@/lib/utils/format";
import { deleteSegmentAction, deleteSnapshotAction, updateSnapshotAction } from "../actions";

export const metadata: Metadata = { title: "Analytics snapshot" };

export default async function SnapshotPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const snap = await getSnapshot(supabase, id);
  if (!snap) notFound();
  const segments = await listSegmentsForSnapshots(supabase, [id]);
  const er = engagementRateByImpressions(snap);

  return (
    <>
      <PageHeader
        title={`${formatDate(snap.reporting_period_start)} – ${formatDate(snap.reporting_period_end)}`}
        description={`${labelFor(SOURCE_TYPES, snap.source_type)} · engagement rate by impressions: ${er.available ? formatPercent(er.value) : `unavailable (${er.reason.toLowerCase()})`}`}
        actions={<>
          <Badge tone={snap.data_source === "manual" ? "neutral" : "primary"}>Source: {snap.data_source.replace("_", " ")}</Badge>
          <ConfirmDelete action={deleteSnapshotAction.bind(null, snap.id, "/analytics")} title="Delete this snapshot?" description="Its audience segments are deleted too, and dashboard totals and trends will change. This can’t be undone." />
        </>}
      />
      {sp.created ? <Alert tone="success" className="mb-4" title="Saved">Add the audience demographics for this period below to unlock your Audience Fit Score.</Alert> : null}
      <Link href="/analytics" className="mb-4 inline-block text-sm text-primary hover:underline">← All analytics</Link>

      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Metrics</CardTitle><CardDescription>Editing recalculates every dependent figure.</CardDescription></CardHeader>
          <CardContent><SnapshotForm action={updateSnapshotAction.bind(null, snap.id)} defaults={snap} submitLabel="Save changes" lockSourceType /></CardContent></Card>

        <Card><CardHeader><CardTitle>Audience demographics</CardTitle><CardDescription>Aggregate figures only. Add what LinkedIn shows — incomplete data is fine and is handled honestly.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {DIMENSIONS.map((d) => {
              const list = segments.filter((s) => s.dimension === d);
              if (list.length === 0) return null;
              return (
                <div key={d}>
                  <h3 className="mb-1 text-sm font-semibold">{DIMENSION_LABELS[d]}</h3>
                  <ul className="divide-y rounded-md border">
                    {list.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span>{s.segment_name} {s.is_estimated ? <Badge className="ml-1">estimated</Badge> : null}</span>
                        <span className="flex items-center gap-3">
                          <span className="tabular text-muted-foreground">{s.percentage !== null ? `${Number(s.percentage)}%` : ""}{s.percentage !== null && s.member_count !== null ? " · " : ""}{s.member_count !== null ? `${s.member_count.toLocaleString()} members` : ""}</span>
                          <ConfirmDelete iconOnly label={`Remove ${s.segment_name}`} action={deleteSegmentAction.bind(null, s.id)} title="Remove this segment?" description={`“${s.segment_name}” will be removed from this snapshot’s audience data.`} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {segments.length === 0 ? <p className="text-sm text-muted-foreground">No demographics yet.</p> : null}
            <div className="border-t pt-4"><h3 className="mb-3 text-sm font-semibold">Add a segment</h3><SegmentForm snapshotId={snap.id} /></div>
          </CardContent></Card>
      </div>
    </>
  );
}
