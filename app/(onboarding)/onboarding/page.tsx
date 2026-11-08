import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { OnboardingWizard } from "@/components/forms/onboarding-wizard";
import { requireUser } from "@/lib/auth";
import { getGoal, getProfile } from "@/lib/services/goals.service";

export const metadata: Metadata = { title: "Set up your career objectives" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [profile, goal] = await Promise.all([getProfile(supabase, user.id), getGoal(supabase, user.id)]);
  const editing = sp.edit === "1" || profile?.onboarding_completed;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2 font-serif text-xl font-semibold"><Radar className="h-5 w-5 text-primary" aria-hidden /> CareerSignal</div>
      <main id="main">
        <OnboardingWizard
          initial={{
            step: editing ? 1 : profile?.onboarding_step || 1,
            goal_types: goal?.goal_types ?? [],
            titles: goal?.target_job_titles ?? [],
            industries: goal?.target_industries ?? [],
            companies: goal?.target_companies ?? [],
            seniority: goal?.target_seniority ?? [],
            locations: goal?.target_locations ?? [],
            completed: Boolean(profile?.onboarding_completed),
          }}
        />
      </main>
    </div>
  );
}
