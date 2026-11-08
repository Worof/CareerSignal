import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import type { PeriodComparison } from "@/lib/calculations/trends";
import { formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Card } from "./card";
import { InfoTip } from "./misc";

export function TrendBadge({ cmp, goodWhen = "up", unit = "" }: { cmp: PeriodComparison; goodWhen?: "up" | "down"; unit?: string }) {
  if (cmp.direction === "unavailable") {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" aria-hidden /> No prior period data</span>;
  }
  const good = cmp.direction === "flat" ? null : (cmp.direction === "up") === (goodWhen === "up");
  const Icon = cmp.direction === "up" ? ArrowUpRight : cmp.direction === "down" ? ArrowDownRight : ArrowRight;
  const text =
    cmp.percentChange !== null
      ? `${cmp.percentChange > 0 ? "+" : ""}${formatPercent(cmp.percentChange, 1)}`
      : `${(cmp.absoluteChange ?? 0) > 0 ? "+" : ""}${formatNumber(cmp.absoluteChange, { decimals: 1 })}${unit}`;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", good === null ? "text-muted-foreground" : good ? "text-positive" : "text-negative")}
      title={`Previous period: ${formatNumber(cmp.previous, { decimals: 1 })}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {text}
      <span className="sr-only">{cmp.direction === "up" ? " increase" : cmp.direction === "down" ? " decrease" : " no change"} versus previous period</span>
    </span>
  );
}

export function StatCard({
  title, value, cmp, goodWhen, explanation, tooltip, footnote, unit,
}: {
  title: string;
  value: string;
  cmp?: PeriodComparison;
  goodWhen?: "up" | "down";
  explanation?: string;
  tooltip?: React.ReactNode;
  footnote?: string;
  unit?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {tooltip ? <InfoTip>{tooltip}</InfoTip> : null}
      </div>
      <p className="tabular mt-2 font-serif text-3xl font-semibold">{value}</p>
      <div className="mt-1 min-h-5">{cmp ? <TrendBadge cmp={cmp} goodWhen={goodWhen} unit={unit} /> : null}</div>
      {explanation ? <p className="mt-2 text-xs text-muted-foreground">{explanation}</p> : null}
      {footnote ? <p className="mt-1 text-[11px] italic text-muted-foreground">{footnote}</p> : null}
    </Card>
  );
}
