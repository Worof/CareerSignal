"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { TagInput } from "./tag-input";
import { saveOnboardingAction } from "@/app/(onboarding)/onboarding/actions";
import {
  GOAL_TYPES, INDUSTRY_SUGGESTIONS, JOB_TITLE_SUGGESTIONS, LOCATION_SUGGESTIONS, SENIORITY_SUGGESTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export interface WizardInitial {
  step: number;
  goal_types: string[];
  titles: string[];
  industries: string[];
  companies: string[];
  seniority: string[];
  locations: string[];
  completed: boolean;
}

const STEPS = [
  { title: "Career objective", description: "What do you want LinkedIn to do for you? Pick all that apply." },
  { title: "Target job titles", description: "Roles you want to be considered for. Add your own if they aren’t listed." },
  { title: "Target industries", description: "Industries whose people you want to reach." },
  { title: "Target companies", description: "Specific companies you’d like to be visible to." },
  { title: "Target seniority", description: "The kinds of people who make or influence hiring decisions." },
  { title: "Target locations", description: "Where your ideal audience is based." },
  { title: "Review", description: "Check your target audience. You can edit this any time from Settings." },
] as const;

export function OnboardingWizard({ initial }: { initial: WizardInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(Math.min(Math.max(initial.step, 1), 7));
  const [goals, setGoals] = useState(initial.goal_types);
  const [titles, setTitles] = useState(initial.titles);
  const [industries, setIndustries] = useState(initial.industries);
  const [companies, setCompanies] = useState(initial.companies);
  const [seniority, setSeniority] = useState(initial.seniority);
  const [locations, setLocations] = useState(initial.locations);
  const [error, setError] = useState<string | null>(null);

  const patchFor = (s: number) => {
    switch (s) {
      case 1: return { goal_types: goals };
      case 2: return { target_job_titles: titles };
      case 3: return { target_industries: industries };
      case 4: return { target_companies: companies };
      case 5: return { target_seniority: seniority };
      case 6: return { target_locations: locations };
      default: return {};
    }
  };

  const validate = (s: number): string | null => {
    if (s === 1 && goals.length === 0) return "Choose at least one objective.";
    if (s === 2 && titles.length === 0) return "Add at least one target job title.";
    return null;
  };

  const save = (nextStep: number, complete = false) => {
    const problem = validate(step);
    if (problem && !complete) { setError(problem); return; }
    setError(null);
    start(async () => {
      const res = await saveOnboardingAction({ ...patchFor(step), step: nextStep, complete });
      if (!res.ok) { setError(res.error ?? "Could not save."); toast.error(res.error ?? "Could not save."); return; }
      if (complete) { router.replace("/analytics/new?welcome=1"); router.refresh(); }
      else setStep(nextStep);
    });
  };

  const currentList = step === 3 ? industries : step === 4 ? companies : step === 5 ? seniority : step === 6 ? locations : null;
  const meta = STEPS[step - 1]!;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mb-6 flex items-center gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i + 1 < step ? "bg-primary" : i + 1 === step ? "bg-primary/60" : "bg-muted")} />
            <span className="sr-only">{`Step ${i + 1}: ${s.title}${i + 1 === step ? " (current)" : ""}`}</span>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Step {step} of 7</p>
          <CardTitle className="text-xl">{meta.title}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-3">
          {error ? <Alert tone="error">{error}</Alert> : null}

          {step === 1 ? (
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Career objectives</legend>
              {GOAL_TYPES.map((g) => {
                const on = goals.includes(g.value);
                return (
                  <label key={g.value} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                    <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={on} onChange={() => setGoals(on ? goals.filter((x) => x !== g.value) : [...goals, g.value])} />
                    {g.label}
                  </label>
                );
              })}
              <p className="col-span-full text-xs text-muted-foreground">The first release is tuned for job seekers; other objectives are stored for future releases.</p>
            </fieldset>
          ) : null}

          {step === 2 ? <TagInput id="titles" value={titles} onChange={setTitles} suggestions={JOB_TITLE_SUGGESTIONS} /> : null}
          {step === 3 ? <TagInput id="industries" value={industries} onChange={setIndustries} suggestions={INDUSTRY_SUGGESTIONS} /> : null}
          {step === 4 ? <TagInput id="companies" value={companies} onChange={setCompanies} placeholder="Company name, then Enter" /> : null}
          {step === 5 ? <TagInput id="seniority" value={seniority} onChange={setSeniority} suggestions={SENIORITY_SUGGESTIONS} /> : null}
          {step === 6 ? <TagInput id="locations" value={locations} onChange={setLocations} suggestions={LOCATION_SUGGESTIONS} placeholder="Country or city, then Enter" /> : null}

          {step === 7 ? (
            <dl className="space-y-4 text-sm">
              {([
                ["Objectives", goals.map((g) => GOAL_TYPES.find((x) => x.value === g)?.label ?? g)],
                ["Job titles", titles], ["Industries", industries], ["Companies", companies], ["Seniority", seniority], ["Locations", locations],
              ] as const).map(([label, values]) => (
                <div key={label}>
                  <dt className="font-medium">{label}</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {values.length === 0 ? <span className="text-muted-foreground">Not set — this dimension will be excluded from your score.</span> : values.map((v) => <span key={v} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{v}</span>)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || pending}><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button>
            <div className="flex items-center gap-2">
              {currentList && currentList.length === 0 ? (
                <Button variant="outline" onClick={() => save(step + 1)} disabled={pending}>Skip</Button>
              ) : null}
              {step < 7 ? (
                <Button onClick={() => save(step + 1)} disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save & continue"} <ArrowRight className="h-4 w-4" aria-hidden /></Button>
              ) : (
                <Button onClick={() => save(7, true)} disabled={pending} aria-busy={pending}><Check className="h-4 w-4" aria-hidden /> {pending ? "Finishing…" : initial.completed ? "Save changes" : "Finish setup"}</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
