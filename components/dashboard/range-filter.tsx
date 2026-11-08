import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/constants";

/** Plain GET form: works without JavaScript and keeps the URL shareable. */
export function RangeFilter({ current, from, to, extra }: { current: RangeKey; from: string; to: string; extra?: Record<string, string | undefined> }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Date range">
      {Object.entries(extra ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div>
        <label htmlFor="range" className="sr-only">Period</label>
        <Select id="range" name="range" defaultValue={current} className="w-44">
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="from" className="sr-only">From</label>
        <Input id="from" name="from" type="date" defaultValue={current === "custom" ? from : ""} className="w-40" />
      </div>
      <div>
        <label htmlFor="to" className="sr-only">To</label>
        <Input id="to" name="to" type="date" defaultValue={current === "custom" ? to : ""} className="w-40" />
      </div>
      <Button type="submit" variant="outline">Apply</Button>
    </form>
  );
}
