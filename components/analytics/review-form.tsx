"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { MetricInputs, type SnapshotDefaults } from "./snapshot-form";
import { DIMENSIONS, DIMENSION_LABELS, SOURCE_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/utils/action-state";

export interface ReviewRow { dimension: string; name: string; percentage: string; count: string }

export function ReviewForm({
  action, defaults, rows: initialRows, posts, confidence, warnings,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: SnapshotDefaults;
  rows: ReviewRow[];
  posts: Array<{ id: string; title: string }>;
  confidence: string | null;
  warnings: string[];
}) {
  const { state, formAction, pending } = useActionForm(action);
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const [source, setSource] = useState(defaults.source_type ?? "");
  const e = state.fieldErrors;
  const set = (i: number, patch: Partial<ReviewRow>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && !state.fieldErrors ? <Alert tone="error">{state.error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Extraction confidence:</span>
        <Badge tone={confidence === "high" ? "positive" : confidence === "medium" ? "warning" : "neutral"}>{confidence ?? "not extracted"}</Badge>
      </div>
      {warnings.length > 0 ? <Alert tone="warning" title="Check these carefully">{warnings.map((w) => <span key={w} className="block">• {w}</span>)}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="source_type" label="What does this screenshot show?" errors={e?.source_type} required hint={source ? undefined : "Couldn’t tell automatically — please choose."}>
          <Select id="source_type" name="source_type" value={source} onChange={(ev) => setSource(ev.target.value)} required>
            <option value="" disabled>Select…</option>
            {SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field id="reporting_period_start" label="Period start" errors={e?.reporting_period_start} required>
          <Input id="reporting_period_start" name="reporting_period_start" type="date" required defaultValue={defaults.reporting_period_start ?? ""} />
        </Field>
        <Field id="reporting_period_end" label="Period end" errors={e?.reporting_period_end} required>
          <Input id="reporting_period_end" name="reporting_period_end" type="date" required defaultValue={defaults.reporting_period_end ?? ""} />
        </Field>
      </div>

      {source === "post_analytics" ? (
        <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Which post is this?</legend>
          <Field id="post_id" label="Existing post">
            <Select id="post_id" name="post_id" defaultValue=""><option value="">— none —</option>{posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>
          </Field>
          <Field id="new_post_title" label="…or create a new post" hint="Used only if no existing post is selected.">
            <Input id="new_post_title" name="new_post_title" maxLength={200} />
          </Field>
          <input type="hidden" name="clicks" value="" />
        </fieldset>
      ) : null}

      <MetricInputs defaults={defaults} errors={e} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Audience segments</legend>
        <p className="text-xs text-muted-foreground">Remove or correct anything that looks wrong. Rows with no name are ignored.</p>
        <input type="hidden" name="seg_count" value={rows.length} />
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No audience breakdown was found in this screenshot.</p> : null}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[9rem_1fr_6rem_6rem_auto]">
            <Select aria-label={`Row ${i + 1} dimension`} name={`seg_dim_${i}`} value={r.dimension} onChange={(ev) => set(i, { dimension: ev.target.value })}>
              {DIMENSIONS.map((d) => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}
            </Select>
            <Input aria-label={`Row ${i + 1} name`} name={`seg_name_${i}`} value={r.name} onChange={(ev) => set(i, { name: ev.target.value })} placeholder="Segment" className="col-span-2 sm:col-span-1" />
            <Input aria-label={`Row ${i + 1} percentage`} name={`seg_pct_${i}`} type="number" step="0.01" min={0} max={100} value={r.percentage} onChange={(ev) => set(i, { percentage: ev.target.value })} placeholder="%" />
            <Input aria-label={`Row ${i + 1} members`} name={`seg_count_${i}`} type="number" step={1} min={0} value={r.count} onChange={(ev) => set(i, { count: ev.target.value })} placeholder="Members" />
            <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} aria-label={`Remove row ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRows([...rows, { dimension: "job_title", name: "", percentage: "", count: "" }])}><Plus className="h-4 w-4" aria-hidden /> Add row</Button>
      </fieldset>

      <SubmitButton pending={pending} pendingText="Importing…">Confirm and import</SubmitButton>
    </form>
  );
}
