import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/auth";
import { AVATARS_BUCKET, UPLOADS_BUCKET } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Safe account deletion. The service-role key is used ONLY here, and only after the caller's identity has been
 * verified through their normal session and they have typed their email as confirmation.
 * All user rows are removed by ON DELETE CASCADE from auth.users.
 */
export async function POST(request: Request) {
  const ctx = await getUserOrNull();
  if (!ctx) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Account deletion is not enabled on this deployment. Contact the administrator." }, { status: 501 });
  }

  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  const email = ctx.user.email?.toLowerCase();
  if (!email || body?.confirm?.trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Type your email address exactly to confirm." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Storage objects are not removed by database cascades, so delete them explicitly (scoped to this user's folder).
  for (const bucket of [UPLOADS_BUCKET, AVATARS_BUCKET]) {
    const prefixes = bucket === UPLOADS_BUCKET ? [`${ctx.user.id}/analytics`] : [ctx.user.id];
    for (const prefix of prefixes) {
      const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      const paths = (data ?? []).filter((o) => o.name).map((o) => `${prefix}/${o.name}`);
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
  if (error) return NextResponse.json({ error: "The account could not be deleted. Please try again." }, { status: 500 });

  await ctx.supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
