"use client";

import { useRef } from "react";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/constants";
import { createSegmentAction } from "@/app/(dashboard)/analytics/actions";

/** Adds one aggregate audience segment to a snapshot OR a post. */
export function SegmentForm({ snapshotId, postId }: { snapshotId?: string; postId?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const { state, formAction, pending } = useActionForm(createSegmentAction, { onSuccess: () => ref.current?.reset() });
  const e = state.fieldErrors;
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-6" noValidate>
      <input type="hidden" name="snapshot_id" value={snapshotId ?? ""} />
      <input type="hidden" name="post_id" value={postId ?? ""} />
      <Field id="dimension" label="Dimension" className="sm:col-span-1" errors={e?.dimension}>
        <Select id="dimension" name="dimension" defaultValue="job_title">{DIMENSIONS.map((d) => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}</Select>
      </Field>
      <Field id="segment_name" label="Segment" className="sm:col-span-2" errors={e?.segment_name} required>
        <Input id="segment_name" name="segment_name" placeholder="e.g. Recruiter" required maxLength={200} aria-invalid={!!e?.segment_name} />
      </Field>
      <Field id="percentage" label="Percentage" errors={e?.percentage}>
        <Input id="percentage" name="percentage" type="number" step="0.01" min={0} max={100} placeholder="12.5" aria-invalid={!!e?.percentage} />
      </Field>
      <Field id="member_count" label="Members" errors={e?.member_count}>
        <Input id="member_count" name="member_count" type="number" step={1} min={0} aria-invalid={!!e?.member_count} />
      </Field>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_estimated" className="h-4 w-4" /> Estimated</label>
        <SubmitButton pending={pending} pendingText="Adding…">Add</SubmitButton>
      </div>
    </form>
  );
}
