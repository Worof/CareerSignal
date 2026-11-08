"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveInsightAction } from "@/app/(dashboard)/insights/actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await archiveInsightAction(id, !archived); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>
      {archived ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}{archived ? "Restore" : "Archive"}
    </Button>
  );
}
