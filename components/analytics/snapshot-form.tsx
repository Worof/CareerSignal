"use client";

import { Alert } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { SOURCE_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/utils/action-state";

export interface SnapshotDefaults {
  source_type?: string;
  reporting_period_start?: string;
  reporting_period_end?: string;
  impressions?: number | null;
  members_reached?: number | null;
  profile_views?: number | null;
  search_appearances?: number | null;
  total_followers?: number | null;
  follower_growth?: number | null;
  reactions?: number | null;
  comments?: number | null;
  reposts?: number | null;
  notes?: string | null;
}

const METRICS = [
  ["impressions", "Impressions"], ["members_reached", "Members reached"], ["profile_views", "Profile views"],
  ["search_appearances", "Search appearances"], ["total_followers", "Total followers"], ["follower_growth", "Follower growth"],
  ["reactions", "Reactions"], ["comments", "Comments"], ["reposts", "Reposts"],
] as const;

/** Blank means "not available" and is stored as NULL — never zero. */
export function MetricInputs({ defaults, errors }: { defaults?: SnapshotDefaults; errors?: Record<string, string[]> }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Metrics</legend>
      <p className="text-xs text-muted-foreground">Leave a field blank if LinkedIn didn’t show it. Blank is stored as “not available”, which is different from 0.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {METRICS.map(([name, label]) => (
          <Field key={name} id={name} label={label} errors={errors?.[name]}>
            <Input id={name} name={name} type="number" inputMode="numeric" step={1} min={name === "follower_growth" ? undefined : 0} defaultValue={defaults?.[name] ?? ""} aria-invalid={!!errors?.[name]} />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

export function SnapshotForm({
  action, defaults, submitLabel = "Save analytics", lockSourceType = false,
}: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; defaults?: SnapshotDefaults; submitLabel?: string; lockSourceType?: boolean }) {
  const { state, formAction, pending } = useActionForm(action);
  const e = state.fieldErrors;
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && !state.fieldErrors ? <Alert tone="error">{state.error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="source_type" label="Data type" errors={e?.source_type} required hint="Different data types are never merged.">
          <Select id="source_type" name="source_type" defaultValue={defaults?.source_type ?? "profile_analytics"} disabled={lockSourceType}>
            {SOURCE_TYPES.filter((s) => s.value !== "post_analytics").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {lockSourceType ? <input type="hidden" name="source_type" value={defaults?.source_type ?? "profile_analytics"} /> : null}
        </Field>
        <Field id="reporting_period_start" label="Period start" errors={e?.reporting_period_start} required>
          <Input id="reporting_period_start" name="reporting_period_start" type="date" required defaultValue={defaults?.reporting_period_start ?? ""} aria-invalid={!!e?.reporting_period_start} />
        </Field>
        <Field id="reporting_period_end" label="Period end" errors={e?.reporting_period_end} required>
          <Input id="reporting_period_end" name="reporting_period_end" type="date" required defaultValue={defaults?.reporting_period_end ?? ""} aria-invalid={!!e?.reporting_period_end} />
        </Field>
      </div>
      <MetricInputs defaults={defaults} errors={e} />
      <Field id="notes" label="Notes" errors={e?.notes} hint="Optional. Where the numbers came from, anything unusual.">
        <Textarea id="notes" name="notes" maxLength={2000} defaultValue={defaults?.notes ?? ""} />
      </Field>
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}
