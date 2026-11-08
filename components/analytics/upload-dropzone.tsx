"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export function UploadDropzone({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Choose a PNG, JPG or WEBP image.");
    if (file.size > MAX_UPLOAD_BYTES) return setError("The image is larger than 4 MB.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string | null; status?: string };
      if (!res.ok || !json.id) throw new Error(json.error ?? "Upload failed.");
      if (json.status === "failed") toast.warning(json.error ?? "Extraction failed — you can retry or enter values manually.");
      router.push(`/analytics/uploads/${json.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!aiConfigured ? <Alert tone="info" title="AI extraction is off">You can still upload a screenshot and type the values in while viewing it. Add an AI provider key to enable automatic extraction.</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void send(f); }}
        className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-card px-6 py-14 text-center"
      >
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden /> : <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden />}
        <p className="font-medium">{busy ? "Uploading and reading your screenshot…" : "Drag a LinkedIn analytics screenshot here"}</p>
        <p className="text-sm text-muted-foreground">PNG, JPG or WEBP · up to 4 MB · stored privately</p>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); }} />
        <Button onClick={() => input.current?.click()} disabled={busy} aria-busy={busy}>Choose a file</Button>
      </div>
      <p className="text-xs text-muted-foreground">Nothing is imported automatically. You review and correct every extracted value before it is saved.</p>
    </div>
  );
}
