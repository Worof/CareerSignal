"use client";

import { useRef } from "react";
import { Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { savePostMetricsAction } from "@/app/(dashboard)/content/actions";

const FIELDS = [["impressions", "Impressions"], ["reactions", "Reactions"], ["comments", "Comments"], ["reposts", "Reposts"], ["clicks", "Clicks"], ["profile_activity", "Profile activity"]] as const;

export function PostMetricForm({ postId }: { postId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const { state, formAction, pending } = useActionForm(savePostMetricsAction, { onSuccess: () => ref.current?.reset() });
  const e = state.fieldErrors;
  return (
    <form ref={ref} action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="post_id" value={postId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="reporting_period_start" label="Period start" errors={e?.reporting_period_start} required><Input id="reporting_period_start" name="reporting_period_start" type="date" required /></Field>
        <Field id="reporting_period_end" label="Period end" errors={e?.reporting_period_end} required><Input id="reporting_period_end" name="reporting_period_end" type="date" required /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {FIELDS.map(([n, l]) => <Field key={n} id={n} label={l} errors={e?.[n]}><Input id={n} name={n} type="number" min={0} step={1} /></Field>)}
      </div>
      <p className="text-xs text-muted-foreground">Blank = not available (stored as NULL, not 0).</p>
      <SubmitButton pending={pending}>Save snapshot</SubmitButton>
    </form>
  );
}
