import type { Metadata } from "next";
import Link from "next/link";
import { AvatarForm, DeleteAccount, ProfileForm, ScoringForm } from "@/components/forms/settings-forms";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { isAIConfigured } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { sanitizeWeights } from "@/lib/calculations/audience-fit";
import { getGoal, getPreferences, getProfile } from "@/lib/services/goals.service";
import { formatSynonyms } from "@/lib/validations/goals";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [profile, goal, prefs] = await Promise.all([getProfile(supabase, user.id), getGoal(supabase, user.id), getPreferences(supabase, user.id)]);
  const goalList = (label: string, v: string[] | undefined) => (
    <div><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 flex flex-wrap gap-1.5">{v?.length ? v.map((x) => <Badge key={x} tone="primary">{x}</Badge>) : <span className="text-sm text-muted-foreground">Not set</span>}</dd></div>
  );

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Profile</CardTitle><CardDescription>{user.email}</CardDescription></CardHeader><CardContent className="space-y-6">
          <ProfileForm fullName={profile?.full_name ?? ""} timezone={profile?.timezone ?? "UTC"} period={prefs?.preferred_reporting_period ?? "30d"} />
          <AvatarForm hasAvatar={Boolean(profile?.avatar_url)} />
        </CardContent></Card>

        <Card><CardHeader className="flex-row items-start justify-between space-y-0"><div className="space-y-1"><CardTitle>Career objectives & targets</CardTitle><CardDescription>The reference point for your Audience Fit Score.</CardDescription></div>
          <Link href="/onboarding?edit=1" className={buttonVariants({ variant: "outline", size: "sm" })}>Edit</Link></CardHeader>
          <CardContent><dl className="grid gap-4 sm:grid-cols-2">{goalList("Job titles", goal?.target_job_titles)}{goalList("Industries", goal?.target_industries)}{goalList("Companies", goal?.target_companies)}{goalList("Seniority", goal?.target_seniority)}{goalList("Locations", goal?.target_locations)}</dl></CardContent></Card>

        <Card><CardHeader><CardTitle>Audience Fit scoring</CardTitle><CardDescription>Adjust how much each dimension counts and teach the matcher your synonyms.</CardDescription></CardHeader>
          <CardContent><ScoringForm weights={sanitizeWeights(goal?.scoring_weights)} synonymsText={formatSynonyms(goal?.synonyms ?? {})} /></CardContent></Card>

        <Card><CardHeader><CardTitle>Integrations</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">AI provider <Badge tone={isAIConfigured() ? "positive" : "neutral"}>{isAIConfigured() ? "configured" : "not configured"}</Badge></p>
          <p className="flex items-center gap-2">Official LinkedIn API <Badge>disabled</Badge></p>
          <p className="text-xs text-muted-foreground">CareerSignal never scrapes LinkedIn. Data comes from what you enter or upload.</p></CardContent></Card>

        <Card className="border-negative/30"><CardHeader><CardTitle>Danger zone</CardTitle><CardDescription>Permanently delete your account and everything in it.</CardDescription></CardHeader>
          <CardContent><DeleteAccount email={user.email ?? ""} enabled={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} /></CardContent></Card>
      </div>
    </>
  );
}
