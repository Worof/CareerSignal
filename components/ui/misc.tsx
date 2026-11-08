import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badge = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground border-transparent",
      primary: "bg-primary/10 text-primary border-transparent",
      positive: "bg-positive/10 text-positive border-transparent",
      negative: "bg-negative/10 text-negative border-transparent",
      warning: "bg-warning/10 text-warning border-transparent",
      outline: "bg-transparent text-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});
export const Badge = ({ className, tone, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => (
  <span className={cn(badge({ tone }), className)} {...p} />
);

export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...p} />
);

const alertStyles = {
  info: { cls: "border-primary/30 bg-primary/5", Icon: Info },
  warning: { cls: "border-warning/40 bg-warning/5", Icon: TriangleAlert },
  error: { cls: "border-negative/40 bg-negative/5", Icon: AlertCircle },
  success: { cls: "border-positive/40 bg-positive/5", Icon: CheckCircle2 },
} as const;

export function Alert({
  tone = "info", title, children, className,
}: { tone?: keyof typeof alertStyles; title?: string; children?: React.ReactNode; className?: string }) {
  const { cls, Icon } = alertStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}

/** Keyboard-accessible explanation popover (native <details>, no JS). */
export function InfoTip({ children, label = "How is this calculated?" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label={label}
        title={label}
        className="flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border text-[10px] font-semibold text-muted-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <div className="absolute left-0 top-6 z-30 w-64 rounded-md border bg-card p-3 text-xs font-normal leading-relaxed text-foreground shadow-lg">{children}</div>
    </details>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon?: React.ComponentType<{ className?: string }>; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center">
      {Icon ? <Icon className="h-8 w-8 text-muted-foreground" /> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
