import { describe, expect, it } from "vitest";
import { resolveRange } from "@/lib/utils/range";

describe("resolveRange", () => {
  const today = "2026-11-08";
  it("resolves presets ending today, inclusive", () => {
    expect(resolveRange({ range: "7d" }, today).range).toEqual({ from: "2026-11-02", to: today });
    expect(resolveRange({ range: "30d" }, today).range.from).toBe("2026-10-10");
  });
  it("accepts a valid custom range", () => {
    expect(resolveRange({ range: "custom", from: "2026-01-01", to: "2026-01-31" }, today)).toEqual({ key: "custom", range: { from: "2026-01-01", to: "2026-01-31" } });
  });
  it("falls back safely on invalid input", () => {
    expect(resolveRange({ range: "custom", from: "garbage", to: "2026-01-31" }, today).key).toBe("30d");
    expect(resolveRange({ range: "custom", from: "2026-02-01", to: "2026-01-01" }, today).key).toBe("30d");
    expect(resolveRange({ range: "nonsense" }, today).key).toBe("30d");
  });
});
