import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "./tz";

export function formatNumber(v: number | null | undefined, opts?: { decimals?: number }): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: opts?.decimals ?? 0 }).format(v);
}

export function formatPercent(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/** Timestamps are stored in UTC; render them in the user's configured timezone. */
export function formatDateTime(iso: string | null | undefined, timeZone = "UTC"): string {
  if (!iso) return "—";
  try {
    return formatInTimeZone(iso, timeZone, "MMM d, yyyy HH:mm");
  } catch {
    return "—";
  }
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISODate(new Date());
}
