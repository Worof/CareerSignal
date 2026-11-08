"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({ pending, children, pendingText = "Saving…", ...props }: ButtonProps & { pending: boolean; pendingText?: string }) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}
