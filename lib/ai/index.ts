import { AnthropicProvider } from "./anthropic";
import type { AIProvider } from "./provider";

/** Returns null when no provider is configured — the rest of the app must keep working. */
export function getAIProvider(): AIProvider | null {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    return new AnthropicProvider(key, process.env.AI_MODEL || "claude-sonnet-5-5");
  }
  return null;
}

export const isAIConfigured = () => getAIProvider() !== null;

export * from "./provider";
