"use client";

import { Alert } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { ATTRIBUTION_SOURCES, OPPORTUNITY_STATUSES, OPPORTUNITY_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/utils/action-state";
import type { Opportunity } from "@/lib/types/db";
import { updateStatusAction } from "@/app/(dashboard)/opportunities/actions";

export function OpportunityForm({ action, opp, submitLabel = "Save opportunity" }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; opp?: Opportunity; submitLabel?: string }) {
  const { state, formAction, pending } = useActionForm(action);
  const e = state.fieldErrors;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors ? <Alert tone="error">{state.error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="company_name" label="Company" errors={e?.company_name} required><Input id="company_name" name="company_name" required maxLength={200} defaultValue={opp?.company_name ?? ""} aria-invalid={!!e?.company_name} /></Field>
        <Field id="opportunity_type" label="Type" errors={e?.opportunity_type} required><Select id="opportunity_type" name="opportunity_type" defaultValue={opp?.opportunity_type ?? "recruiter_inquiry"}>{OPPORTUNITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field id="contact_name" label="Contact name" errors={e?.contact_name} hint="Optional. Never sent to the AI provider."><Input id="contact_name" name="contact_name" maxLength={200} defaultValue={opp?.contact_name ?? ""} /></Field>
        <Field id="contact_role" label="Contact role" errors={e?.contact_role}><Input id="contact_role" name="contact_role" maxLength={200} defaultValue={opp?.contact_role ?? ""} /></Field>
        <Field id="related_job_title" label="Related job title" errors={e?.related_job_title}><Input id="related_job_title" name="related_job_title" maxLength={200} defaultValue={opp?.related_job_title ?? ""} /></Field>
        <Field id="source" label="Source details" errors={e?.source} hint="E.g. message, InMail, event"><Input id="source" name="source" maxLength={200} defaultValue={opp?.source ?? ""} /></Field>
        <Field id="attribution_source" label="Where did it come from?" errors={e?.attribution_source} hint="Your own judgement. We never assume LinkedIn content was the cause." required>
          <Select id="attribution_source" name="attribution_source" defaultValue={opp?.attribution_source ?? "unknown"}>{ATTRIBUTION_SOURCES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field id="status" label="Status" errors={e?.status} required><Select id="status" name="status" defaultValue={opp?.status ?? "new"}>{OPPORTUNITY_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field id="received_at" label="Date received" errors={e?.received_at} required><Input id="received_at" name="received_at" type="date" required defaultValue={opp?.received_at ?? today} /></Field>
        <Field id="last_interaction_at" label="Last interaction" errors={e?.last_interaction_at}><Input id="last_interaction_at" name="last_interaction_at" type="date" defaultValue={opp?.last_interaction_at ?? ""} /></Field>
        <Field id="outcome_at" label="Outcome date" errors={e?.outcome_at}><Input id="outcome_at" name="outcome_at" type="date" defaultValue={opp?.outcome_at ?? ""} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_relevant" defaultChecked={opp?.is_relevant ?? true} className="h-4 w-4" /> Relevant to my goals</label>
      </div>
      <Field id="notes" label="Notes" errors={e?.notes} hint="Private. Never sent to the AI provider."><Textarea id="notes" name="notes" maxLength={5000} defaultValue={opp?.notes ?? ""} /></Field>
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}

export function StatusForm({ id, status }: { id: string; status: string }) {
  const { formAction, pending } = useActionForm(updateStatusAction.bind(null, id));
  return (
    <form action={formAction} className="flex items-end gap-2">
      <Field id="quick-status" label="Move to"><Select id="quick-status" name="status" defaultValue={status} className="w-52">{OPPORTUNITY_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
      <SubmitButton pending={pending} variant="outline" pendingText="Updating…">Update</SubmitButton>
    </form>
  );
}
