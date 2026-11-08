import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewForm, type ReviewRow } from "@/components/analytics/review-form";
import { RetryButton } from "@/components/analytics/retry-button";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Alert, Badge, PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { UPLOADS_BUCKET } from "@/lib/constants";
import { listPosts } from "@/lib/services/content.service";
import { getUpload } from "@/lib/services/upload.service";
import { uuid } from "@/lib/validations/common";
import { extractionSchema } from "@/lib/validations/ai";
import { confirmImportAction, deleteUploadAction } from "../actions";

export const metadata: Metadata = { title: "Review upload" };

export default async function ReviewUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const job = await getUpload(supabase, id);
  if (!job) notFound();

  const signed = await supabase.storage.from(UPLOADS_BUCKET).createSignedUrl(job.storage_path, 600);
  const posts = await listPosts(supabase);

  // The stored extraction is untrusted: re-validate before pre-filling the form.
  const parsed = extractionSchema.safeParse(job.extracted_data);
  const ex = parsed.success ? parsed.data : null;
  const rawWarnings = (job.extracted_data as { warnings?: unknown } | null)?.warnings;
  const warnings = ex?.warnings ?? (Array.isArray(rawWarnings) ? rawWarnings.filter((w): w is string => typeof w === "string") : []);
  const rows: ReviewRow[] = (ex?.audience_segments ?? []).map((s) => ({ dimension: s.dimension, name: s.value, percentage: s.percentage === null ? "" : String(s.percentage), count: s.member_count === null ? "" : String(s.member_count) }));
  const m = ex?.metrics;
  const n = (v: number | null | undefined) => (typeof v === "number" ? v : null);

  return (
    <>
      <PageHeader title="Review extracted data" description="Compare the values with the screenshot, correct anything wrong, then confirm. Nothing is saved until you do."
        actions={<><Badge>{job.processing_status.replace("_", " ")}</Badge><ConfirmDelete action={deleteUploadAction.bind(null, job.id, "/analytics/uploads")} title="Delete this upload?" description="The stored image and record are deleted." /></>} />
      <Link href="/analytics/uploads" className="mb-4 inline-block text-sm text-primary hover:underline">← All uploads</Link>

      {job.processing_status === "completed" ? <Alert tone="success" title="Already imported">This screenshot has been imported and can’t be imported again.</Alert> : null}
      {job.processing_status === "failed" ? (
        <Alert tone="error" title="Extraction failed" className="mb-4">{job.error_message ?? "The values couldn’t be read."} You can retry, or enter the values below manually.<div className="mt-2"><RetryButton id={job.id} /></div></Alert>
      ) : null}

      {job.processing_status !== "completed" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:sticky lg:top-20 lg:self-start"><CardContent className="pt-5">
            {signed.data?.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signed.data.signedUrl} alt={`Uploaded screenshot ${job.original_filename}`} className="w-full rounded-md border" />
            ) : <p className="text-sm text-muted-foreground">The image couldn’t be loaded.</p>}
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <ReviewForm
              action={confirmImportAction.bind(null, job.id)}
              confidence={job.extraction_confidence}
              warnings={warnings}
              rows={rows}
              posts={posts.map((p) => ({ id: p.id, title: p.title }))}
              defaults={{
                source_type: ex?.source_type ?? "",
                reporting_period_start: ex?.reporting_period.start_date ?? "",
                reporting_period_end: ex?.reporting_period.end_date ?? "",
                impressions: n(m?.impressions), members_reached: n(m?.members_reached), profile_views: n(m?.profile_views),
                search_appearances: n(m?.search_appearances), total_followers: n(m?.total_followers), follower_growth: n(m?.follower_growth),
                reactions: n(m?.reactions), comments: n(m?.comments), reposts: n(m?.reposts),
              }}
            />
          </CardContent></Card>
        </div>
      ) : null}
    </>
  );
}
