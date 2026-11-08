import { CompositionChart, TimeSeriesChart } from "@/components/analytics/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { DimensionResult } from "@/lib/calculations/audience-fit";
import { DIMENSION_LABELS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils/format";

export function DimensionCard({
  result, targets, history,
}: { result: DimensionResult; targets: string[]; history: Array<{ label: string; match: number | null }> }) {
  const unit = result.unit === "member_count" ? "members" : "%";
  const data = result.segments.slice().sort((a, b) => b.weight - a.weight).slice(0, 10).map((s) => ({ name: s.segment, value: s.weight, matched: s.matched }));
  const matchedPct = result.usable && result.matchRate !== null ? result.matchRate * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">{DIMENSION_LABELS[result.dimension]}
          {result.usable ? <Badge tone="primary">{formatPercent(matchedPct, 0)} match</Badge> : <Badge>No data</Badge>}
        </CardTitle>
        <CardDescription>
          Targets: {targets.length ? targets.join(", ") : "none set — excluded from your score"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result.usable ? <p className="text-sm text-muted-foreground">{result.reason}</p> : (
          <>
            <CompositionChart data={data} unit={unit} summary={`${formatPercent(matchedPct, 0)} of the listed audience matches; ${formatPercent(100 - (matchedPct ?? 0), 0)} does not.${result.unit === "percentage" ? ` Listed segments account for ${result.totalWeight.toFixed(0)}% of the audience; the rest was not itemised.` : ""}`} />
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.segments.filter((s) => s.matched && s.matchType !== "exact").map((s) => (
                <li key={s.segment}>“{s.segment}” counted as “{s.matchedTarget}” ({s.matchType === "synonym" ? "configured synonym" : "normalised text match"}).</li>
              ))}
            </ul>
          </>
        )}
        {history.filter((h) => h.match !== null).length >= 2 ? (
          <div><p className="mb-1 text-sm font-medium">Historical match rate</p><TimeSeriesChart data={history} series={[{ key: "match", label: "Match %", color: "#0f766e" }]} yFormat="percent" height={160} /></div>
        ) : null}
      </CardContent>
    </Card>
  );
}
