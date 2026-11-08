"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

/** Multi-value chip input with suggestions and custom entries. Emits string[] via onChange. */
export function TagInput({
  id, value, onChange, suggestions = [], placeholder = "Type and press Enter",
}: { id: string; value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());
  const add = (raw: string) => {
    const t = raw.trim().slice(0, 100);
    if (t && !has(t) && value.length < 50) onChange([...value, t]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" aria-live="polite">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm text-primary">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="rounded-full p-0.5 hover:bg-primary/20">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
      />
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !has(s)).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className={cn("rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted")}>
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
