"use client";

import { Alert } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { CONTENT_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/utils/action-state";
import type { Post } from "@/lib/types/db";

export function PostForm({ action, post, submitLabel = "Save post" }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; post?: Post; submitLabel?: string }) {
  const { state, formAction, pending } = useActionForm(action);
  const e = state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors ? <Alert tone="error">{state.error}</Alert> : null}
      <Field id="title" label="Title or short description" errors={e?.title} required>
        <Input id="title" name="title" required maxLength={200} defaultValue={post?.title ?? ""} aria-invalid={!!e?.title} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="content_type" label="Content type" errors={e?.content_type}>
          <Select id="content_type" name="content_type" defaultValue={post?.content_type ?? "text"}>{CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
        </Field>
        <Field id="published_at" label="Published on" errors={e?.published_at}>
          <Input id="published_at" name="published_at" type="date" defaultValue={post?.published_at?.slice(0, 10) ?? ""} />
        </Field>
        <Field id="topics" label="Topics" hint="Comma-separated" errors={e?.topics}>
          <Input id="topics" name="topics" defaultValue={post?.topics.join(", ") ?? ""} />
        </Field>
      </div>
      <Field id="post_url" label="Post URL" errors={e?.post_url} hint="Optional">
        <Input id="post_url" name="post_url" type="url" placeholder="https://www.linkedin.com/posts/…" defaultValue={post?.post_url ?? ""} aria-invalid={!!e?.post_url} />
      </Field>
      <Field id="post_text" label="Post text" errors={e?.post_text} hint="Optional. Stays private and is never sent to the AI provider.">
        <Textarea id="post_text" name="post_text" maxLength={10000} defaultValue={post?.post_text ?? ""} />
      </Field>
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}
