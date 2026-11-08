import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { CountBarChart } from "@/components/analytics/charts";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { countByStatus } from "@/lib/calculations/aggregate";
import { ATTRIBUTION_SOURCES, OPPORTUNITY_STATUSES, OPPORTUNITY_TYPES, labelFor } from "@/lib/constants";
import { listOpportunities } from "@/lib/services/opportunity.service";
import { formatDate } from "@/lib/utils/format";
import { deleteOpportunityAction } from "./actions";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const [all, opps] = await Promise.all([
    listOpportunities(supabase),
    listOpportunities(supabase, { status: sp.status || undefined, attribution: sp.attribution || undefined, type: sp.type || undefined, from: iso.test(sp.from ?? "") ? sp.from : undefined, to: iso.test(sp.to ?? "") ? sp.to : undefined }),
  ]);
  const counts = countByStatus(all);
  const pipeline = OPPORTUNITY_STATUSES.map((s) => ({ label: s.label, count: counts[s.value] ?? 0 })).filter((d) => d.count > 0);

  return (
    <>
      <PageHeader title="Opportunities" description="Your lightweight career CRM. Attribution is whatever you tell us — we never infer it." actions={<Link href="/opportunities/new" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" aria-hidden /> Add opportunity</Link>} />
      {all.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No opportunities tracked yet" description="Log recruiter messages, interviews and referrals to see how your pipeline moves and how it relates to your visibility." action={<Link href="/opportunities/new" className={buttonVariants()}>Add your first opportunity</Link>} />
      ) : (
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Pipeline</CardTitle></CardHeader><CardContent>
            <CountBarChart data={pipeline} bars={[{ key: "count", label: "Opportunities" }]} horizontal height={Math.max(160, pipeline.length * 38)} summary={pipeline.map((p) => `${p.label}: ${p.count}`).join(" · ")} />
          </CardContent></Card>

          <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Filter opportunities">
            <div><label htmlFor="status" className="sr-only">Status</label><Select id="status" name="status" defaultValue={sp.status ?? ""} className="w-44"><option value="">All statuses</option>{OPPORTUNITY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
            <div><label htmlFor="attribution" className="sr-only">Source</label><Select id="attribution" name="attribution" defaultValue={sp.attribution ?? ""} className="w-48"><option value="">All sources</option>{ATTRIBUTION_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
            <div><label htmlFor="type" className="sr-only">Type</label><Select id="type" name="type" defaultValue={sp.type ?? ""} className="w-48"><option value="">All types</option>{OPPORTUNITY_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
            <div><label htmlFor="from" className="sr-only">From</label><Input id="from" name="from" type="date" defaultValue={sp.from ?? ""} className="w-40" /></div>
            <div><label htmlFor="to" className="sr-only">To</label><Input id="to" name="to" type="date" defaultValue={sp.to ?? ""} className="w-40" /></div>
            <button className={buttonVariants({ variant: "outline" })}>Filter</button>
            <Link href="/opportunities" className="px-2 py-2 text-sm text-muted-foreground hover:underline">Clear</Link>
          </form>

          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Opportunities</caption>
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th scope="col" className="p-3">Company</th><th scope="col" className="p-3">Type</th><th scope="col" className="p-3">Received</th><th scope="col" className="p-3">Source</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {opps.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3"><Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">{o.company_name}</Link>{!o.is_relevant ? <Badge className="ml-2">not relevant</Badge> : null}{o.contact_role ? <p className="text-xs text-muted-foreground">{o.contact_role}</p> : null}</td>
                    <td className="p-3">{labelFor(OPPORTUNITY_TYPES, o.opportunity_type)}</td>
                    <td className="p-3">{formatDate(o.received_at)}</td>
                    <td className="p-3">{labelFor(ATTRIBUTION_SOURCES, o.attribution_source)}</td>
                    <td className="p-3"><Badge tone={["offer_received", "accepted"].includes(o.status) ? "positive" : ["rejected", "closed", "archived"].includes(o.status) ? "neutral" : "primary"}>{labelFor(OPPORTUNITY_STATUSES, o.status)}</Badge></td>
                    <td className="p-3 text-right"><ConfirmDelete iconOnly label={`Delete ${o.company_name}`} action={deleteOpportunityAction.bind(null, o.id, undefined)} title="Delete this opportunity?" description="The record and its history are deleted. This can’t be undone." /></td>
                  </tr>
                ))}
                {opps.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No opportunities match these filters.</td></tr> : null}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
