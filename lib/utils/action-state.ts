import type { ZodTypeAny, z } from "zod";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Optional id of the created/updated record. */
  id?: string;
  /** Monotonic marker so the UI can fire a toast once per submission. */
  nonce?: number;
}

export const initialState: ActionState = {};

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionState {
  return { ok: false, error, fieldErrors, nonce: Date.now() };
}
export function succeed(message?: string, extra?: Partial<ActionState>): ActionState {
  return { ok: true, message, nonce: Date.now(), ...extra };
}

/** FormData → plain object. Repeated keys become arrays. Blank strings stay as "". */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

export function parseWith<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of r.error.issues) {
    const k = issue.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(issue.message);
  }
  const first = r.error.issues[0];
  return { ok: false, state: fail(first?.message ?? "Please check the form and try again.", fieldErrors) };
}

/** Translates database errors into something a person can act on, without leaking internals. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong.";
  switch (error.code) {
    case "23505":
      return "A record for this period or item already exists. Edit the existing one instead of creating a duplicate.";
    case "23503":
      return "A related record could not be found.";
    case "23514":
      return "One of the values is outside the allowed range.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return "We couldn't save your changes. Please try again.";
  }
}
