"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "./submit-button";
import { useActionForm } from "./use-action-form";
import { DIMENSIONS, DIMENSION_LABELS, WEIGHT_KEYS, type ScoringWeights } from "@/lib/constants";
import { removeAvatarAction, resetScoringAction, updateProfileAction, updateScoringAction, uploadAvatarAction } from "@/app/(dashboard)/settings/actions";

export function ProfileForm({ fullName, timezone, period }: { fullName: string; timezone: string; period: string }) {
  const { state, formAction, pending } = useActionForm(updateProfileAction);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
  const e = state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="full_name" label="Full name" errors={e?.full_name}><Input id="full_name" name="full_name" defaultValue={fullName} maxLength={120} /></Field>
        <Field id="timezone" label="Timezone" errors={e?.timezone} hint="Timestamps are stored in UTC and shown in this zone.">
          <Select id="timezone" name="timezone" defaultValue={timezone}>{(zones.includes(timezone) ? zones : [timezone, ...zones]).map((z) => <option key={z} value={z}>{z}</option>)}</Select></Field>
        <Field id="preferred_reporting_period" label="Default dashboard period"><Select id="preferred_reporting_period" name="preferred_reporting_period" defaultValue={period}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="6m">Last 6 months</option></Select></Field>
      </div>
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}

export function AvatarForm({ hasAvatar }: { hasAvatar: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const { formAction, pending } = useActionForm(uploadAvatarAction, { onSuccess: () => ref.current?.reset() });
  const [removing, startRemove] = useTransition();
  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-3">
      <Field id="avatar" label="Profile photo" hint="PNG, JPG or WEBP, up to 1 MB."><Input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required /></Field>
      <SubmitButton pending={pending} variant="outline" pendingText="Uploading…">Upload</SubmitButton>
      {hasAvatar ? <Button variant="ghost" disabled={removing} onClick={() => startRemove(async () => { const r = await removeAvatarAction(); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>Remove photo</Button> : null}
    </form>
  );
}

export function ScoringForm({ weights, synonymsText }: { weights: ScoringWeights; synonymsText: string }) {
  const { state, formAction, pending } = useActionForm(updateScoringAction);
  const [vals, setVals] = useState<ScoringWeights>(weights);
  const [resetting, startReset] = useTransition();
  const router = useRouter();
  const total = Object.values(vals).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors ? <Alert tone="error">{state.error}</Alert> : null}
      <fieldset>
        <legend className="text-sm font-medium">Dimension weights</legend>
        <p className="mb-3 text-xs text-muted-foreground">Relative importance of each dimension. Weights are normalised over the dimensions that actually have data, so they don’t need to add up to 100.</p>
        <div className="grid gap-3 sm:grid-cols-5">
          {DIMENSIONS.map((d) => { const k = WEIGHT_KEYS[d]; return (
            <Field key={d} id={`w-${k}`} label={DIMENSION_LABELS[d]} errors={state.fieldErrors?.[k]}>
              <Input id={`w-${k}`} name={k} type="number" min={0} max={100} step={1} value={vals[k]} onChange={(ev) => setVals({ ...vals, [k]: Number(ev.target.value) })} />
            </Field>); })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">Total: {total}{state.fieldErrors?._ ? ` — ${state.fieldErrors._[0]}` : ""}</p>
      </fieldset>
      <Field id="synonyms" label="Synonyms" hint="One group per line: “ml engineer = machine learning engineer, ml eng”. Matching also uses exact and normalised text." >
        <Textarea id="synonyms" name="synonyms" defaultValue={synonymsText} rows={4} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton pending={pending}>Save scoring settings</SubmitButton>
        <Button variant="outline" disabled={resetting} onClick={() => startReset(async () => { const r = await resetScoringAction(); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); })}>Reset to defaults</Button>
      </div>
    </form>
  );
}

export function DeleteAccount({ email, enabled }: { email: string; enabled: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = () => start(async () => {
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: typed }) });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) { toast.error(json.error ?? "Could not delete the account."); return; }
    toast.success("Your account and data were deleted.");
    router.replace("/");
    router.refresh();
  });
  return (
    <>
      <Button variant="destructive" disabled={!enabled} onClick={() => ref.current?.showModal()}>Delete my account</Button>
      {!enabled ? <p className="mt-2 text-xs text-muted-foreground">Account deletion needs <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server.</p> : null}
      <dialog ref={ref} aria-labelledby="del-title" className="w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-6 text-foreground shadow-xl">
        <h2 id="del-title" className="text-lg font-semibold">Delete your account?</h2>
        <p className="mt-2 text-sm text-muted-foreground">This permanently deletes your profile, analytics, posts, opportunities, insights and uploaded files. It can’t be undone.</p>
        <Field id="confirm-email" label={`Type ${email} to confirm`} className="mt-4"><Input id="confirm-email" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
        <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => ref.current?.close()} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={run} disabled={pending || typed.trim().toLowerCase() !== email.toLowerCase()} aria-busy={pending}>{pending ? "Deleting…" : "Delete everything"}</Button></div>
      </dialog>
    </>
  );
}
