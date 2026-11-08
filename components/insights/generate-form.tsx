"use client";

import { Sparkles } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { INSIGHT_TYPES, RANGE_OPTIONS } from "@/lib/constants";
import { generateInsightAction } from "@/app/(dashboard)/insights/actions";

export function GenerateInsightForm({ disabled }: { disabled: boolean }) {
  const { state, formAction, pending } = useActionForm(generateInsightAction);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-end" noValidate>
      <Field id="insight_type" label="Insight" errors={state.fieldErrors?.insight_type}>
        <Select id="insight_type" name="insight_type" defaultValue="weekly_summary">{INSIGHT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
      </Field>
      <Field id="range" label="Period"><Select id="range" name="range" defaultValue="30d">{RANGE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
      <Field id="from" label="From (custom)"><Input id="from" name="from" type="date" /></Field>
      <Field id="to" label="To (custom)"><Input id="to" name="to" type="date" /></Field>
      <SubmitButton pending={pending || disabled} disabled={disabled} pendingText={disabled && !pending ? "Unavailable" : "Generating…"}><Sparkles className="h-4 w-4" aria-hidden /> Generate</SubmitButton>
    </form>
  );
}
