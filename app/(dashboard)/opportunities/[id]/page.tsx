import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpportunityForm, StatusForm } from "@/components/opportunities/opportunity-form";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { OPPORTUNITY_STATUSES, labelFor } from "@/lib/constants";
import { getProfile } from "@/lib/services/goals.service";
import { getOpportunity, listOpportunityEvents } from "@/lib/services/opportunity.service";
import { uuid } from "@/lib/validations/common";
import { formatDateTime } from "@/lib/utils/format";
import { deleteOpportunityAction, updateOpportunityAction } from "../actions";

export const metadata: Metadata = { title: "Opportunity" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, user } = await requireUser();
  const opp = await getOpportunity(supabase, id);
  if (!opp) notFound();
  const [events, profile] = await Promise.all([listOpportunityEvents(supabase, id), getProfile(supabase, user.id)]);

  return (
    <>
      <PageHeader title={opp.company_name} description={opp.contact_role ?? undefined} actions={<ConfirmDelete action={deleteOpportunityAction.bind(null, opp.id, "/opportunities")} title="Delete this opportunity?" description="The record and its history are deleted. This can’t be undone." />} />
      <Link href="/opportunities" className="mb-4 inline-block text-sm text-primary hover:underline">← All opportunities</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Update status</CardTitle></CardHeader><CardContent><StatusForm id={opp.id} status={opp.status} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent><OpportunityForm action={updateOpportunityAction.bind(null, opp.id)} opp={opp} submitLabel="Save changes" /></CardContent></Card>
        </div>
        <Card className="self-start"><CardHeader><CardTitle>History</CardTitle><CardDescription>Recorded automatically by the database.</CardDescription></CardHeader>
          <CardContent>
            <ol className="space-y-3 border-l pl-4">
              {events.map((ev) => (
                <li key={ev.id} className="relative text-sm">
                  <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <p className="font-medium">{ev.event_type === "created" ? `Created as ${labelFor(OPPORTUNITY_STATUSES, ev.to_status)}` : `${labelFor(OPPORTUNITY_STATUSES, ev.from_status)} → ${labelFor(OPPORTUNITY_STATUSES, ev.to_status)}`}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(ev.created_at, profile?.timezone)}</p>
                </li>
              ))}
              {events.length === 0 ? <li className="text-sm text-muted-foreground">No history yet.</li> : null}
            </ol>
          </CardContent></Card>
      </div>
    </>
  );
}
