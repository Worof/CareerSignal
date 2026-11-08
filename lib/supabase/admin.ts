import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

/**
 * Service-role client. Bypasses RLS — use ONLY for the account-deletion route, after the caller's
 * identity has been verified with a normal session. Never import this from client code.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const { url } = requireSupabaseEnv();
  return createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
