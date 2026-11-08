import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, InfoTip } from "@/components/ui/misc";
import type { AudienceFitResult } from "@/lib/calculations/audience-fit";
import { DIMENSION_LABELS, DEFAULT_WEIGHTS, WEIGHT_KEYS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils/format";

export function FitExplainer() {
  return (
    <>
      <p>
        Audience Fit Score = Σ(weight × match rate) ÷ Σ(available weights). Each dimension’s match rate is the share of your
        <em> identifiable</em> audience that matches your targets.
      </p>
      <p className="mt-2">Dimensions without targets or data are <strong>excluded</strong> (never counted as zero) and the remaining weights are renormalised. Default weights: titles {DEFAULT_WEIGHTS.job_titles}%, industries {DEFAULT_WEIGHTS.industries}%, companies {DEFAULT_WEIGHTS.companies}%, seniority {DEFAULT_WEIGHTS.seniority}%, locations {DEFAULT_WEIGHTS.locations}%.</p>
    </>
  );
}

export function FitCard({ result, periodLabel }: { result: AudienceFitResult | null; periodLabel?: string }) {
  const cov = result?.coverage;
  const statusBadge =
    result?.status === "ok" ? <Badge tone="positive">Sufficient data</Badge>
    : result?.status === "low_confidence" ? <Badge tone="warning">Low confidence</Badge>
    : <Badge tone="neutral">Insufficient data</Badge>;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">Career Audience Fit Score <InfoTip><FitExplainer /></InfoTip></CardTitle>
          {periodLabel ? <p className="text-xs text-muted-foreground">{periodLabel}</p> : null}
        </div>
        {result ? statusBadge : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="tabular font-serif text-5xl font-semibold">{result?.score === null || !result ? "—" : Math.round(result.score)}<span className="text-xl text-muted-foreground">{result?.score === null || !result ? "" : " / 100"}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Audience alignment — not popularity or employment probability.</p>
          </div>
          <div>
            <p className="text-sm font-medium">Data coverage</p>
            <p className="tabular font-serif text-3xl font-semibold">{cov?.ratio == null ? "—" : `${Math.round(cov.ratio * 100)}%`}</p>
            <p className="text-xs text-muted-foreground">{cov ? `${cov.dimensionsWithData} of ${cov.targetedDimensions} targeted dimensions have data` : "No data"}</p>
          </div>
        </div>

        {result ? (
          result.status === "ok" ? <p className="text-sm text-muted-foreground">{result.explanation}</p>
          : <Alert tone={result.status === "low_confidence" ? "warning" : "info"}>{result.explanation}</Alert>
        ) : <Alert tone="info">Import audience demographics to calculate your score.</Alert>}

        {result && result.contributions.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">What contributed</p>
            <ul className="space-y-1.5 text-sm">
              {result.contributions.map((c) => (
                <li key={c.dimension} className="flex items-center justify-between gap-3">
                  <span>{DIMENSION_LABELS[c.dimension]} <span className="text-xs text-muted-foreground">(weight {Math.round(c.weight * 100)}% of this score)</span></span>
                  <span className="tabular">{formatPercent(c.matchRate * 100, 0)} match</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-xs italic text-muted-foreground">Based on identifiable or available LinkedIn audience data, not necessarily everyone who viewed your content.</p>
      </CardContent>
    </Card>
  );
}

export { WEIGHT_KEYS };
