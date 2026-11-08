"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#2b3a82", "#b45309", "#0f766e", "#9f1239"];
const MATCH = "#0f766e";
const NO_MATCH = "#c7c3b8";

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

/** Charts always ship with a text summary (see `summary`) so meaning never depends on colour alone. */
export function TimeSeriesChart({
  data, series, xKey = "label", yFormat, height = 240, summary, emptyText = "Not enough data yet",
}: {
  data: Array<Record<string, string | number | null>>;
  series: SeriesDef[];
  xKey?: string;
  yFormat?: "number" | "percent";
  height?: number;
  summary?: string;
  emptyText?: string;
}) {
  const hasData = data.length > 0 && series.some((s) => data.some((d) => typeof d[s.key] === "number"));
  const fmt = (v: number) => (yFormat === "percent" ? `${v.toFixed(1)}%` : new Intl.NumberFormat("en-US", { notation: "compact" }).format(v));
  return (
    <figure>
      <div style={{ height }} role="img" aria-label={summary ?? "Time series chart"}>
        {!hasData ? <Empty text={emptyText} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmt} width={48} />
              <Tooltip formatter={(v: number) => (yFormat === "percent" ? `${v.toFixed(1)}%` : v.toLocaleString())} />
              {series.length > 1 ? <Legend /> : null}
              {series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? COLORS[i % COLORS.length]} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={{ r: 3 }} connectNulls={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {summary ? <figcaption className="mt-2 text-xs text-muted-foreground">{summary}</figcaption> : null}
    </figure>
  );
}

export function CountBarChart({
  data, bars, xKey = "label", height = 240, summary, emptyText = "Not enough data yet", horizontal = false,
}: {
  data: Array<Record<string, string | number | null>>;
  bars: SeriesDef[];
  xKey?: string;
  height?: number;
  summary?: string;
  emptyText?: string;
  horizontal?: boolean;
}) {
  return (
    <figure>
      <div style={{ height }} role="img" aria-label={summary ?? "Bar chart"}>
        {data.length === 0 ? <Empty text={emptyText} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 24 : 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d9" />
              {horizontal ? (<><XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} /><YAxis type="category" dataKey={xKey} tick={{ fontSize: 12 }} width={110} /></>) : (<><XAxis dataKey={xKey} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={32} /></>)}
              <Tooltip />
              {bars.length > 1 ? <Legend /> : null}
              {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color ?? COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {summary ? <figcaption className="mt-2 text-xs text-muted-foreground">{summary}</figcaption> : null}
    </figure>
  );
}

export interface CompositionDatum {
  name: string;
  value: number;
  matched: boolean;
}

/** Audience composition: matched segments are teal, others grey, and the legend + labels say so in words. */
export function CompositionChart({ data, unit, height = 260, summary }: { data: CompositionDatum[]; unit: "%" | "members"; height?: number; summary?: string }) {
  return (
    <figure>
      <div style={{ height }} role="img" aria-label={summary ?? "Audience composition"}>
        {data.length === 0 ? <Empty text="No audience data for this dimension" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} unit={unit === "%" ? "%" : ""} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(v: number, _n, item) => [`${v}${unit === "%" ? "%" : ""}`, (item?.payload as CompositionDatum | undefined)?.matched ? "Matches target" : "Not a target"]} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {data.map((d) => <Cell key={d.name} fill={d.matched ? MATCH : NO_MATCH} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: MATCH }} /> Matches your target</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: NO_MATCH }} /> Not a target</span>
        {summary ? <span className="basis-full">{summary}</span> : null}
      </figcaption>
    </figure>
  );
}
