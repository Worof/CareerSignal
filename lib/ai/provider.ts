import type { ZodType, ZodTypeDef } from "zod";

export interface AIImage {
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  base64: string;
}

export interface AIRequest {
  system: string;
  user: string;
  image?: AIImage;
  maxTokens?: number;
  timeoutMs?: number;
}

/** Provider-independent contract. Add OpenAI/Gemini/etc. by implementing this single method. */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  completeText(req: AIRequest): Promise<string>;
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "timeout" | "provider" | "invalid_output",
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

/** Calls the provider, parses JSON, validates with Zod. One corrective retry on invalid output. */
export async function completeJSON<T>(
  provider: AIProvider,
  req: AIRequest,
  schema: ZodType<T, ZodTypeDef, unknown>,
  extraCheck?: (value: T) => string | null,
): Promise<T> {
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const user = attempt === 0 ? req.user : `${req.user}\n\nYour previous answer was rejected: ${lastProblem}\nReturn corrected JSON only.`;
    const text = await provider.completeText({ ...req, user });
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch {
      lastProblem = "it was not valid JSON";
      continue;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      lastProblem = `schema errors: ${result.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
      continue;
    }
    const problem = extraCheck?.(result.data) ?? null;
    if (problem) {
      lastProblem = problem;
      continue;
    }
    return result.data;
  }
  throw new AIError(`The AI response could not be validated (${lastProblem}).`, "invalid_output");
}
