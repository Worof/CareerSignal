import { AIError, type AIProvider, type AIRequest } from "./provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 529]);

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async completeText(req: AIRequest): Promise<string> {
    const content: unknown[] = [];
    if (req.image) {
      content.push({ type: "image", source: { type: "base64", media_type: req.image.mediaType, data: req.image.base64 } });
    }
    content.push({ type: "text", text: req.user });

    const body = JSON.stringify({
      model: this.model,
      max_tokens: req.maxTokens ?? 1500,
      system: req.system,
      messages: [{ role: "user", content }],
    });

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 45_000);
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
          body,
          signal: controller.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
          const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
          if (!text) throw new AIError("The AI provider returned an empty response.", "provider");
          return text;
        }
        if (RETRYABLE.has(res.status) && attempt < maxAttempts) {
          await sleep(400 * 2 ** (attempt - 1));
          continue;
        }
        // Never include the response body: it can echo request content.
        throw new AIError(`The AI provider returned HTTP ${res.status}.`, "provider");
      } catch (e) {
        if (e instanceof AIError) throw e;
        if (e instanceof Error && e.name === "AbortError") {
          if (attempt < maxAttempts) continue;
          throw new AIError("The AI provider timed out.", "timeout");
        }
        if (attempt < maxAttempts) {
          await sleep(400 * 2 ** (attempt - 1));
          continue;
        }
        throw new AIError("Could not reach the AI provider.", "provider");
      } finally {
        clearTimeout(timer);
      }
    }
    throw new AIError("The AI provider failed.", "provider");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
