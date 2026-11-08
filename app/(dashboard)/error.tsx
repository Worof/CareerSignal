"use client";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10">
      <Alert tone="error" title="Something went wrong">
        We couldn’t load this page. Your data is safe. {error.digest ? <span className="block text-xs">Reference: {error.digest}</span> : null}
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
