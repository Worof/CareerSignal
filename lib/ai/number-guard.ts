/**
 * Heuristic anti-hallucination check: every meaningful number in generated prose must be traceable to
 * the structured input we supplied. Small integers (< 10, not percentages) are ignored because they are
 * usually counts in a sentence ("two periods"). Years are ignored.
 */
export function collectNumbers(value: unknown, out: Set<number> = new Set()): Set<number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    out.add(value);
    out.add(Math.abs(value));
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectNumbers(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectNumbers(v, out));
  } else if (typeof value === "string") {
    for (const n of extractNumbers(value)) out.add(n.value);
  }
  return out;
}

interface Found {
  value: number;
  percent: boolean;
  raw: string;
}

export function extractNumbers(text: string): Found[] {
  const found: Found[] = [];
  const re = /(\d[\d,]*(?:\.\d+)?)(\s?%)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? "";
    const value = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(value)) found.push({ value, percent: Boolean(m[2]), raw: m[0] });
  }
  return found;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.005);

export function findUnsupportedNumbers(text: string, allowed: Set<number>): string[] {
  const bad: string[] = [];
  for (const f of extractNumbers(text)) {
    if (!f.percent && Number.isInteger(f.value) && f.value < 10) continue; // small counts
    if (!f.percent && Number.isInteger(f.value) && f.value >= 1900 && f.value <= 2100) continue; // years
    let ok = false;
    for (const a of allowed) {
      if (close(f.value, a)) {
        ok = true;
        break;
      }
    }
    if (!ok) bad.push(f.raw.trim());
  }
  return bad;
}
