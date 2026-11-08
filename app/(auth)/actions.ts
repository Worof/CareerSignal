"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { safeNext } from "@/lib/utils/safe-redirect";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Use at least 8 characters").max(128);

async function siteUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const notConfigured = () => fail("Supabase is not configured for this deployment. See the README setup steps.");

export async function signInAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!getSupabaseEnv()) return notConfigured();
  const parsed = parseWith(z.object({ email, password: z.string().min(1, "Enter your password") }), formDataToObject(fd));
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for every failure: never reveal whether an account exists.
  if (error) return fail("Incorrect email or password.");
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function signUpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!getSupabaseEnv()) return notConfigured();
  const parsed = parseWith(
    z.object({ full_name: z.string().trim().min(1, "Enter your name").max(120), email, password }),
    formDataToObject(fd),
  );
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) {
    return fail(error.message.toLowerCase().includes("password") ? error.message : "We couldn't create your account. Please try again.");
  }
  if (data.session) redirect("/onboarding");
  return succeed("Check your inbox to confirm your email, then sign in.");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!getSupabaseEnv()) return notConfigured();
  const parsed = parseWith(z.object({ email }), formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password` });
  // Identical response whether or not the address exists.
  return succeed("If an account exists for that email, a reset link is on its way.");
}

export async function updatePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!getSupabaseEnv()) return notConfigured();
  const parsed = parseWith(
    z.object({ password, confirm: z.string() }).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" }),
    formDataToObject(fd),
  );
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("We couldn't update your password. Please try again.");
  redirect("/dashboard");
}
