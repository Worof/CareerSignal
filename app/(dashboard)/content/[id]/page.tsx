import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SegmentForm } from "@/components/analytics/segment-form";
import { FitCard } from "@/components/audience/fit-card";
import { PostForm } from "@/components/content/post-form";
import { PostMetricForm } from "@/components/content/metric-form";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { engagementRateByImpressions } from "@/lib/calculations/engagement";
import { DIMENSION_LABELS } from "@/lib/constants";
import { computeAudienceFit, listSegmentsForPosts } from "@/lib/services/audience.service";
import { getPost, listPostMetrics } from "@/lib/services/content.service";
import { getGoal } from "@/lib/services/goals.service";
import { uuid } from "@/lib/validations/common";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils/format";
import { deleteSegmentAction } from "../../analytics/actions";
import { deletePostAction, deletePostMetricAction, updatePostAction } from "../actions";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, user } = await requireUser();
  const post = await getPost(supabase, id);
  if (!post) notFound();
  const [metrics, segments, goal] = await Promise.all([listPostMetrics(supabase, [id]), listSegmentsForPosts(supabase, [id]), getGoal(supabase, user.id)]);
  const fit = segments.length > 0 ? computeAudienceFit(segments, goal) : null;

  return (
    <>
      <PageHeader title={post.title} description={post.post_url ?? undefined} actions={<ConfirmDelete action={deletePostAction.bind(null, post.id, "/content")} title="Delete this post?" description="Its performance snapshots and audience data are deleted too. This can’t be undone." />} />
      <Link href="/content" className="mb-4 inline-block text-sm text-primary hover:underline">← All content</Link>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent><PostForm action={updatePostAction.bind(null, post.id)} post={post} submitLabel="Save changes" /></CardContent></Card>

        <Card><CardHeader><CardTitle>Performance</CardTitle><CardDescription>One snapshot per reporting period. Each period stays separate.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {metrics.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><caption className="sr-only">Performance snapshots</caption>
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th scope="col" className="p-2">Period</th><th scope="col" className="p-2 text-right">Impressions</th><th scope="col" className="p-2 text-right">Engagement</th><th scope="col" className="p-2 text-right">Profile activity</th><th scope="col" className="p-2"><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>{metrics.map((m) => { const er = engagementRateByImpressions(m); return (
                  <tr key={m.id} className="border-b last:border-0"><td className="p-2">{formatDate(m.reporting_period_start)} – {formatDate(m.reporting_period_end)}</td><td className="tabular p-2 text-right">{formatNumber(m.impressions)}</td><td className="tabular p-2 text-right">{er.available ? formatPercent(er.value) : "—"}</td><td className="tabular p-2 text-right">{formatNumber(m.profile_activity)}</td>
                    <td className="p-2 text-right"><ConfirmDelete iconOnly label="Remove snapshot" action={deletePostMetricAction.bind(null, m.id)} title="Remove this snapshot?" description="Only this reporting period’s numbers are removed." /></td></tr>); })}</tbody></table></div>
            ) : <p className="text-sm text-muted-foreground">No performance recorded yet.</p>}
            <div className="border-t pt-4"><h3 className="mb-3 text-sm font-semibold">Add a performance snapshot</h3><PostMetricForm postId={post.id} /></div>
          </CardContent></Card>

        <Card><CardHeader><CardTitle>Audience of this post</CardTitle><CardDescription>Optional. Add the demographics LinkedIn shows for this post to measure how well it reached your targets.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {segments.length > 0 ? (
              <ul className="divide-y rounded-md border">{segments.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span>{DIMENSION_LABELS[s.dimension]}: {s.segment_name}</span>
                  <span className="flex items-center gap-3"><span className="tabular text-muted-foreground">{s.percentage !== null ? `${Number(s.percentage)}%` : `${s.member_count} members`}</span>
                    <ConfirmDelete iconOnly label={`Remove ${s.segment_name}`} action={deleteSegmentAction.bind(null, s.id)} title="Remove this segment?" description="It will no longer count toward this post’s audience fit." /></span></li>))}</ul>
            ) : null}
            <SegmentForm postId={post.id} />
            {fit ? <FitCard result={fit} periodLabel="For this post" /> : null}
          </CardContent></Card>
      </div>
    </>
  );
}
