"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/utils/action-state";

/** Destructive action behind a native <dialog> (focus-trapped, Esc to cancel). */
export function ConfirmDelete({
  action, label = "Delete", title, description, size = "sm", iconOnly = false,
}: {
  action: () => Promise<ActionState>;
  label?: string;
  title: string;
  description: string;
  size?: "sm" | "default";
  iconOnly?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message ?? "Deleted");
        ref.current?.close();
      } else {
        toast.error(res.error ?? "Could not delete");
      }
    });

  return (
    <>
      <Button variant="outline" size={iconOnly ? "icon" : size} onClick={() => ref.current?.showModal()} aria-label={iconOnly ? label : undefined} className="text-negative hover:bg-negative/10">
        <Trash2 className="h-4 w-4" aria-hidden />
        {iconOnly ? null : label}
      </Button>
      <dialog ref={ref} aria-labelledby="confirm-title" className="w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-6 text-foreground shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => ref.current?.close()} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={run} disabled={pending} aria-busy={pending}>{pending ? "Deleting…" : "Delete"}</Button>
        </div>
      </dialog>
    </>
  );
}
