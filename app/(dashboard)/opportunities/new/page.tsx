import type { Metadata } from "next";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { createOpportunityAction } from "../actions";

export const metadata: Metadata = { title: "Add opportunity" };

export default function NewOpportunityPage() {
  return (<><PageHeader title="Add an opportunity" description="Record a recruiter message, interview, referral or other professional interaction." /><Card><CardContent className="pt-5"><OpportunityForm action={createOpportunityAction} submitLabel="Create opportunity" /></CardContent></Card></>);
}
