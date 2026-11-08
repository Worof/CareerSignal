import type { Metadata } from "next";
import Link from "next/link";
import { SnapshotForm } from "@/components/analytics/snapshot-form";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/misc";
import { createSnapshotAction } from "../actions";

export const metadata: Metadata = { title: "Add analytics" };

export default async function NewSnapshotPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Add analytics" description="Enter the numbers LinkedIn shows for one reporting period." actions={<Link href="/analytics/upload" className="text-sm text-primary hover:underline">Prefer a screenshot? Upload one →</Link>} />
      {sp.welcome ? <Alert tone="success" title="You’re all set up" className="mb-4">CareerSignal needs analytics data to measure anything. Add your first reporting period below, or upload a screenshot.</Alert> : null}
      <Card><CardContent className="pt-5"><SnapshotForm action={createSnapshotAction} /></CardContent></Card>
    </>
  );
}
