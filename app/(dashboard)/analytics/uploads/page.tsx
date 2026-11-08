import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { listUploads } from "@/lib/services/upload.service";
import { formatDateTime } from "@/lib/utils/format";
import { getProfile } from "@/lib/services/goals.service";
import { deleteUploadAction } from "./actions";

export const metadata: Metadata = { title: "Uploads" };

const TONE = { pending: "neutral", processing: "primary", awaiting_review: "warning", completed: "positive", failed: "negative" } as const;

export default async function UploadsPage() {
  const { supabase, user } = await requireUser();
  const [uploads, profile] = await Promise.all([listUploads(supabase), getProfile(supabase, user.id)]);
  return (
    <>
      <PageHeader title="Uploads" description="Screenshots you’ve uploaded and where each one stands." actions={<Link href="/analytics/upload" className={buttonVariants({ size: "sm" })}><Camera className="h-4 w-4" aria-hidden /> Upload screenshot</Link>} />
      {uploads.length === 0 ? (
        <EmptyState icon={Camera} title="No uploads yet" description="Upload a screenshot and review the extracted values before importing." action={<Link href="/analytics/upload" className={buttonVariants()}>Upload screenshot</Link>} />
      ) : (
        <Card><ul className="divide-y">
          {uploads.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/analytics/uploads/${u.id}`} className="block truncate font-medium hover:underline">{u.original_filename}</Link>
                <p className="text-xs text-muted-foreground">{formatDateTime(u.created_at, profile?.timezone)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={TONE[u.processing_status]}>{u.processing_status.replace("_", " ")}</Badge>
                <ConfirmDelete iconOnly label={`Delete ${u.original_filename}`} action={deleteUploadAction.bind(null, u.id, undefined)} title="Delete this upload?" description="The stored image and this record are deleted. Data you already imported from it stays." />
              </div>
            </li>
          ))}
        </ul></Card>
      )}
    </>
  );
}
