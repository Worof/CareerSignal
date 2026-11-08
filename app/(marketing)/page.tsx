import Link from "next/link";
import { ArrowRight, BarChart3, BriefcaseBusiness, Radar, ShieldCheck, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const features = [
  { icon: Target, title: "Audience fit, not vanity", body: "Compare who actually sees your content with the roles, industries, companies and seniority you want to reach." },
  { icon: BarChart3, title: "Transparent scoring", body: "A configurable, deterministic score that shows its working and tells you when the data is too thin to trust." },
  { icon: BriefcaseBusiness, title: "Opportunity tracker", body: "Log recruiter messages, interviews and referrals, then see how outcomes relate to visibility — without claiming false causation." },
  { icon: ShieldCheck, title: "Private by design", body: "Row-level security on every table and private storage for screenshots. No scraping, ever." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-serif text-xl font-semibold"><Radar className="h-5 w-5 text-primary" aria-hidden /> CareerSignal</span>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
          <Link href="/signup" className={buttonVariants()}>Get started</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-14 text-center sm:pt-24">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">Career intelligence for LinkedIn</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">Measure the opportunities behind your visibility.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Likes and impressions don’t tell you whether the right people are watching. CareerSignal answers a better question:
            is my LinkedIn presence reaching the people who can help me reach my professional goals?
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>Create your free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>Sign in</Link>
          </div>
        </section>

        <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pb-20">
          <h2 id="features" className="sr-only">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border bg-card p-6">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        CareerSignal is an independent tool and is not affiliated with or endorsed by LinkedIn. It analyses data you provide.
      </footer>
    </div>
  );
}
