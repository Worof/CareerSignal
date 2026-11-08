import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AIError, completeJSON, stripJsonFences, type AIProvider } from "@/lib/ai/provider";
import { collectNumbers, findUnsupportedNumbers } from "@/lib/ai/number-guard";
import { extractionSchema, insightOutputSchema } from "@/lib/validations/ai";
import { EXTENSIONS, safeFilename, sniffImageType, validateUpload } from "@/lib/services/upload.service";

const provider = (responses: string[]): AIProvider => {
  let i = 0;
  return { name: "fake", model: "m", completeText: async () => responses[Math.min(i++, responses.length - 1)] ?? "" };
};

describe("completeJSON", () => {
  const schema = z.object({ n: z.number() });
  it("parses fenced JSON", async () => {
    expect(await completeJSON(provider(['```json\n{"n":1}\n```']), { system: "", user: "" }, schema)).toEqual({ n: 1 });
  });
  it("retries once with feedback then succeeds", async () => {
    expect(await completeJSON(provider(["nope", '{"n":2}']), { system: "", user: "" }, schema)).toEqual({ n: 2 });
  });
  it("throws invalid_output after the retry also fails", async () => {
    await expect(completeJSON(provider(["nope", '{"n":"x"}']), { system: "", user: "" }, schema)).rejects.toMatchObject({ kind: "invalid_output" });
    await expect(completeJSON(provider(["{}"]), { system: "", user: "" }, schema)).rejects.toBeInstanceOf(AIError);
  });
  it("applies the extra check and retries", async () => {
    const out = await completeJSON(provider(['{"n":5}', '{"n":6}']), { system: "", user: "" }, schema, (v) => (v.n === 5 ? "five is banned" : null));
    expect(out.n).toBe(6);
  });
  it("stripJsonFences tolerates surrounding prose", () => {
    expect(stripJsonFences('Here you go: {"a":1} thanks')).toBe('{"a":1}');
  });
});

describe("number guard (no invented statistics)", () => {
  const input = { impressions: 12400, change_pct: -12.5, score: 61.3, nested: [{ v: 340 }] };
  const allowed = collectNumbers(input);
  it("accepts numbers present in the input, with formatting and rounding", () => {
    expect(findUnsupportedNumbers("Impressions were 12,400, down 12.5% with a fit of 61.3 and 340 views.", allowed)).toEqual([]);
    expect(findUnsupportedNumbers("Down about 12.5%, fit near 61.", allowed)).toEqual([]);
  });
  it("flags numbers that are not in the input", () => {
    expect(findUnsupportedNumbers("Profile views jumped 87% to 5,200.", allowed)).toEqual(["87%", "5,200"]);
  });
  it("ignores small counts and years", () => {
    expect(findUnsupportedNumbers("Over 3 periods in 2026 you posted 2 times.", allowed)).toEqual([]);
  });
});

describe("AI output schemas", () => {
  it("extraction: defaults optional metrics to null and rejects bad percentages", () => {
    const ok = extractionSchema.parse({
      source_type: "audience_demographics",
      reporting_period: { start_date: null, end_date: null },
      metrics: { impressions: null, members_reached: null, profile_views: null, reactions: null, comments: null, reposts: null },
      audience_segments: [{ dimension: "job_title", value: "Recruiter", percentage: 12.5, member_count: null }],
      confidence: "medium", warnings: [],
    });
    expect(ok.metrics.search_appearances).toBeNull();
    expect(extractionSchema.safeParse({ ...ok, audience_segments: [{ dimension: "job_title", value: "x", percentage: 140, member_count: null }] }).success).toBe(false);
  });
  it("insight output requires the general-recommendation flag", () => {
    expect(insightOutputSchema.safeParse({ title: "t", analysis: "a", recommendation: null, evidence: [] }).success).toBe(false);
  });
});

describe("upload validation", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
  it("identifies real image signatures", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(EXTENSIONS["image/jpeg"]).toBe("jpg");
  });
  it("rejects renamed non-images (the client MIME type is not trusted)", () => {
    const html = new Uint8Array(Buffer.from("<script>alert(1)</script>"));
    expect(validateUpload({ size: html.length }, html)).toEqual({ ok: false, error: expect.stringMatching(/genuine/i) });
  });
  it("enforces size and emptiness", () => {
    expect(validateUpload({ size: 5 * 1024 * 1024 }, png).ok).toBe(false);
    expect(validateUpload({ size: 0 }, png).ok).toBe(false);
    expect(validateUpload({ size: 100 }, png)).toEqual({ ok: true, mime: "image/png" });
  });
  it("sanitises filenames and strips paths", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("C:\\x\\sc ree<n>.png")).toBe("sc ree_n_.png");
  });
});
