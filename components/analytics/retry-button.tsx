"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryUploadAction } from "@/app/(dashboard)/analytics/uploads/actions";

export function RetryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button size="sm" variant="outline" disabled={pending} aria-busy={pending} onClick={() => start(async () => {
      const r = await retryUploadAction(id);
      if (r.ok) toast.success(r.message); else toast.error(r.error);
      router.refresh();
    })}>{pending ? "Retrying…" : "Retry extraction"}</Button>
  );
}
