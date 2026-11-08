import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Verifies the session with Supabase Auth on the server. Every protected page, Server Action
 * and Route Handler calls this — client-side checks are never the only line of defence.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

/** For Route Handlers: returns null instead of redirecting so the handler can respond with 401. */
export async function getUserOrNull(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}
