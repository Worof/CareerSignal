import type { SupabaseClient } from "@supabase/supabase-js";
import { AIError, completeJSON, getAIProvider } from "@/lib/ai";
import { EXTRACTION_SYSTEM, EXTRACTION_USER } from "@/lib/ai/prompts";
import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES, UPLOADS_BUCKET } from "@/lib/constants";
import type { UploadJob } from "@/lib/types/db";
import { extractionSchema, type Extraction } from "@/lib/validations/ai";

export const UPLOAD_HOURLY_LIMIT = 20;

type Mime = (typeof ALLOWED_IMAGE_MIME)[number];

/** Verifies the file's real signature — the client-supplied MIME type and extension are not trusted. */
export function sniffImageType(bytes: Uint8Array): Mime | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export const EXTENSIONS: Record<Mime, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function validateUpload(file: { size: number }, bytes: Uint8Array): { ok: true; mime: Mime } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: `The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  const mime = sniffImageType(bytes);
  if (!mime) return { ok: false, error: "Only genuine PNG, JPG or WEBP images are accepted." };
  return { ok: true, mime };
}

export function safeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "upload";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "upload";
}

export async function listUploads(supabase: SupabaseClient): Promise<UploadJob[]> {
  const { data, error } = await supabase.from("upload_jobs").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(`Failed to load uploads: ${error.message}`);
  return (data ?? []) as UploadJob[];
}

export async function getUpload(supabase: SupabaseClient, id: string): Promise<UploadJob | null> {
  const { data, error } = await supabase.from("upload_jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load upload: ${error.message}`);
  return data as UploadJob | null;
}

/** Runs vision extraction. Result is stored for REVIEW — nothing is imported without user confirmation. */
export async function processUpload(supabase: SupabaseClient, job: UploadJob, bytes: Uint8Array): Promise<{ status: UploadJob["processing_status"]; error?: string }> {
  const provider = getAIProvider();
  if (!provider) {
    await supabase
      .from("upload_jobs")
      .update({
        processing_status: "awaiting_review",
        extracted_data: { warnings: ["AI extraction is not configured. Enter the values manually while viewing the screenshot."] },
        error_message: null,
      })
      .eq("id", job.id);
    return { status: "awaiting_review" };
  }

  await supabase.from("upload_jobs").update({ processing_status: "processing", error_message: null }).eq("id", job.id);
  try {
    const extraction: Extraction = await completeJSON(
      provider,
      {
        system: EXTRACTION_SYSTEM,
        user: EXTRACTION_USER,
        image: { mediaType: job.mime_type as Mime, base64: Buffer.from(bytes).toString("base64") },
        maxTokens: 2000,
      },
      extractionSchema,
    );
    await supabase
      .from("upload_jobs")
      .update({
        processing_status: "awaiting_review",
        extracted_data: extraction,
        extraction_confidence: extraction.confidence,
        source_type: extraction.source_type,
      })
      .eq("id", job.id);
    return { status: "awaiting_review" };
  } catch (e) {
    const message = e instanceof AIError ? e.message : "Extraction failed.";
    await supabase.from("upload_jobs").update({ processing_status: "failed", error_message: message }).eq("id", job.id);
    return { status: "failed", error: message };
  }
}

export async function deleteUploadFully(supabase: SupabaseClient, job: UploadJob) {
  const rm = await supabase.storage.from(UPLOADS_BUCKET).remove([job.storage_path]);
  if (rm.error) return { error: rm.error };
  return supabase.from("upload_jobs").delete().eq("id", job.id);
}
