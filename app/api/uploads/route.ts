import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/auth";
import { UPLOADS_BUCKET } from "@/lib/constants";
import { EXTENSIONS, UPLOAD_HOURLY_LIMIT, processUpload, safeFilename, validateUpload } from "@/lib/services/upload.service";
import type { UploadJob } from "@/lib/types/db";

export const runtime = "nodejs";
export const maxDuration = 60; // vision extraction can take a while

export async function POST(request: Request) {
  const ctx = await getUserOrNull();
  if (!ctx) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { supabase, user } = ctx;

  // Per-user rate limit, backed by the database so it holds across serverless instances.
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from("upload_jobs").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= UPLOAD_HOURLY_LIMIT) {
    return NextResponse.json({ error: `Upload limit reached (${UPLOAD_HOURLY_LIMIT} per hour). Try again later.` }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "The file is larger than 4 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(file, bytes);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 415 });

  // The storage name is server-generated; the user's filename is kept only as sanitised metadata.
  const storagePath = `${user.id}/analytics/${randomUUID()}.${EXTENSIONS[check.mime]}`;
  const up = await supabase.storage.from(UPLOADS_BUCKET).upload(storagePath, bytes, { contentType: check.mime, upsert: false });
  if (up.error) return NextResponse.json({ error: "The file could not be stored." }, { status: 500 });

  const { data, error } = await supabase
    .from("upload_jobs")
    .insert({ user_id: user.id, storage_path: storagePath, original_filename: safeFilename(file.name), mime_type: check.mime, file_size: file.size })
    .select("*")
    .single();
  if (error || !data) {
    await supabase.storage.from(UPLOADS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "The upload could not be recorded." }, { status: 500 });
  }

  const result = await processUpload(supabase, data as UploadJob, bytes);
  return NextResponse.json({ id: (data as UploadJob).id, status: result.status, error: result.error ?? null });
}
