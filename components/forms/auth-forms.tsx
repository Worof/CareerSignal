"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "./submit-button";
import { useActionForm } from "./use-action-form";
import {
  requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction,
} from "@/app/(auth)/actions";

export function SignInForm({ next, callbackError }: { next?: string; callbackError?: boolean }) {
  const { state, formAction, pending } = useActionForm(signInAction);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {callbackError ? <Alert tone="error">That confirmation link is invalid or has expired. Try signing in or request a new link.</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="Email" errors={state.fieldErrors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field id="password" label="Password" errors={state.fieldErrors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.fieldErrors?.password} />
      </Field>
      <SubmitButton pending={pending} pendingText="Signing in…" className="w-full">Sign in</SubmitButton>
      <p className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <Link href="/signup" className="text-primary hover:underline">Create an account</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const { state, formAction, pending } = useActionForm(signUpAction);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Field id="full_name" label="Full name" errors={state.fieldErrors?.full_name} required>
        <Input id="full_name" name="full_name" autoComplete="name" required aria-invalid={!!state.fieldErrors?.full_name} />
      </Field>
      <Field id="email" label="Email" errors={state.fieldErrors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters." errors={state.fieldErrors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!state.fieldErrors?.password} />
      </Field>
      <SubmitButton pending={pending} pendingText="Creating account…" className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { state, formAction, pending } = useActionForm(requestPasswordResetAction);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Field id="email" label="Email" errors={state.fieldErrors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <SubmitButton pending={pending} pendingText="Sending…" className="w-full">Send reset link</SubmitButton>
      <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const { state, formAction, pending } = useActionForm(updatePasswordAction);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field id="password" label="New password" hint="At least 8 characters." errors={state.fieldErrors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field id="confirm" label="Confirm new password" errors={state.fieldErrors?.confirm} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton pending={pending} pendingText="Updating…" className="w-full">Update password</SubmitButton>
    </form>
  );
}
