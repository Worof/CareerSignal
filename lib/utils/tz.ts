/** Minimal timezone-aware formatter built on Intl. Supports the single pattern used by the app. */
export function formatInTimeZone(iso: string, timeZone: string, _pattern: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("month")} ${get("day")}, ${get("year")} ${hour}:${get("minute")}`;
}
