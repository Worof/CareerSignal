import * as React from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-negative";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(control, "h-10", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-24", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(control, "h-10", className)} {...p} />
));
Select.displayName = "Select";

export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium leading-none", className)} {...p} />
);

/** Label + control + hint + error, wired with aria attributes. `errors` comes from ActionState.fieldErrors. */
export function Field({
  id, label, hint, errors, required, className, children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const err = errors?.[0];
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-negative" aria-hidden> *</span> : null}
      </Label>
      {children}
      {hint && !err ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      {err ? <p id={`${id}-error`} role="alert" className="text-xs font-medium text-negative">{err}</p> : null}
    </div>
  );
}
