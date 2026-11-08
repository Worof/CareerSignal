"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UPLOADS_BUCKET } from "@/lib/constants";
import { createSnapshot, deleteSnapshot } from "@/lib/services/analytics.service";
import { createPost, savePostMetrics } from "@/lib/services/content.service";
import { deleteUploadFully, getUpload, processUpload } from "@/lib/services/upload.service";
import { dbErrorMessage, fail, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { snapshotSchema } from "@/lib/validations/analytics";
import { uuid } from "@/lib/validations/common";
import { postMetricSchema } from "@/lib/validations/content";
import { z } from "zod";
import { DIMENSIONS } from "@/lib/constants";

const refresh = () => revalidatePath("/", "layout");

const segmentRowSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  segment_name: z.string().trim().min(1).max(200),
  percentage: z.number().min(0).max(100).nullable(),
  member_count: z.number().int().min(0).nullable(),
});

/** Collects repeated seg_*_N fields into rows. Rows without a name are ignored; bad rows are reported. */
function readSegments(fd: FormData): { rows: z.infer<typeof segmentRowSchema>[]; error?: string } {
  const count = Math.min(Number(fd.get("seg_count") ?? 0) || 0, 60);
  const rows: z.infer<typeof segmentRowSchema>[] = [];
  for (let i = 0; i < count; i++) {
    const name = String(fd.get(`seg_name_${i}`) ?? "").trim();
    if (!name) continue;
    const pct = String(fd.get(`seg_pct_${i}`) ?? "").trim();
    const cnt = String(fd.get(`seg_count_${i}`) ?? "").trim();
    const r = segmentRowSchema.safeParse({
      dimension: fd.get(`seg_dim_${i}`),
      segment_name: name,
      percentage: pct === "" ? null : Number(pct),
      member_count: cnt === "" ? null : Number(cnt),
    });
    if (!r.success) return { rows: [], error: `Audience row ${i + 1} (“${name}”) has an invalid value.` };
    if (r.data.percentage === null && r.data.member_count === null) return { rows: [], error: `Audience row ${i + 1} (“${name}”) needs a percentage or a count.` };
    rows.push(r.data);
  }
  return { rows };
}

function fdObject(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

/**
 * Confirms a reviewed extraction. Nothing is imported until the user submits this form,
 * and each upload can be imported exactly once.
 */
export async function confirmImportAction(jobId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!uuid.safeParse(jobId).success) return fail("Invalid upload.");
  const job = await getUpload(supabase, jobId);
  if (!job) return fail("Upload not found.");
  if (job.processing_status === "completed") return fail("This upload has already been imported.");

  const raw = fdObject(fd);
  const seg = readSegments(fd);
  if (seg.error) return fail(seg.error);

  let redirectTo = "/analytics";

  if (raw.source_type === "post_analytics") {
    const parsed = parseWith(postMetricSchema, { ...raw, post_id: raw.post_id || "00000000-0000-4000-8000-000000000000" });
    if (!parsed.ok) return parsed.state;
    let postId = String(raw.post_id ?? "");
    if (!postId) {
      const title = String(raw.new_post_title ?? "").trim();
      if (!title) return fail("Choose the post these metrics belong to, or enter a title for a new post.");
      const created = await createPost(supabase, user.id, { title, post_url: null, post_text: null, content_type: "text", topics: [], published_at: null });
      if (created.error || !created.data) return fail(dbErrorMessage(created.error));
      postId = (created.data as { id: string }).id;
    }
    const metrics = await savePostMetrics(supabase, user.id, { ...parsed.data, post_id: postId }, "screenshot");
    if (metrics.error) return fail(dbErrorMessage(metrics.error));
    if (seg.rows.length > 0) {
      const ins = await supabase.from("audience_segments").insert(seg.rows.map((s) => ({ ...s, user_id: user.id, post_id: postId, data_source: "screenshot" })));
      if (ins.error) return fail(dbErrorMessage(ins.error));
    }
    redirectTo = `/content/${postId}`;
  } else {
    const parsed = parseWith(snapshotSchema, raw);
    if (!parsed.ok) return parsed.state;
    const snap = await createSnapshot(supabase, user.id, parsed.data, { dataSource: "screenshot", uploadJobId: job.id });
    if (snap.error || !snap.data) return fail(dbErrorMessage(snap.error));
    const snapshotId = (snap.data as { id: string }).id;
    if (seg.rows.length > 0) {
      const ins = await supabase.from("audience_segments").insert(seg.rows.map((s) => ({ ...s, user_id: user.id, analytics_snapshot_id: snapshotId, data_source: "screenshot" })));
      if (ins.error) {
        await deleteSnapshot(supabase, snapshotId); // compensate: never leave a half-imported snapshot
        return fail(dbErrorMessage(ins.error));
      }
    }
    redirectTo = `/analytics/${snapshotId}?created=1`;
  }

  await supabase.from("upload_jobs").update({ processing_status: "completed", source_type: String(raw.source_type) }).eq("id", job.id);
  refresh();
  redirect(redirectTo);
}

export async function deleteUploadAction(id: string, redirectTo?: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid upload.");
  const job = await getUpload(supabase, id);
  if (!job) return fail("Upload not found.");
  const res = await deleteUploadFully(supabase, job);
  if (res.error) return fail(dbErrorMessage(res.error));
  refresh();
  if (redirectTo) redirect(redirectTo);
  return succeed("Upload and file deleted.");
}

export async function retryUploadAction(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid upload.");
  const job = await getUpload(supabase, id);
  if (!job) return fail("Upload not found.");
  if (job.processing_status === "completed") return fail("This upload has already been imported.");
  const file = await supabase.storage.from(UPLOADS_BUCKET).download(job.storage_path);
  if (file.error || !file.data) return fail("Could not read the stored file.");
  const res = await processUpload(supabase, job, new Uint8Array(await file.data.arrayBuffer()));
  refresh();
  return res.status === "failed" ? fail(res.error ?? "Extraction failed again.") : succeed("Extraction finished. Review the values below.");
}
