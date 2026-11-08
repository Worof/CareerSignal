import { redirect } from "next/navigation";
import { AppShell, type Notice } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { AVATARS_BUCKET } from "@/lib/constants";
import { getProfile } from "@/lib/services/goals.service";
import { signOutAction } from "../(auth)/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const [{ count: awaiting }, { count: snapshots }] = await Promise.all([
    supabase.from("upload_jobs").select("id", { count: "exact", head: true }).eq("processing_status", "awaiting_review"),
    supabase.from("analytics_snapshots").select("id", { count: "exact", head: true }),
  ]);
  const notices: Notice[] = [];
  if ((awaiting ?? 0) > 0) notices.push({ id: "review", text: `${awaiting} screenshot${awaiting === 1 ? "" : "s"} awaiting your review`, href: "/analytics/uploads" });
  if ((snapshots ?? 0) === 0) notices.push({ id: "import", text: "Add your first analytics to unlock the dashboard", href: "/analytics/new" });

  let avatarUrl: string | null = null;
  if (profile.avatar_url) {
    const { data } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(profile.avatar_url, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <AppShell name={profile.full_name ?? ""} email={user.email ?? ""} avatarUrl={avatarUrl} notices={notices} signOut={signOutAction}>
      {children}
    </AppShell>
  );
}
