import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { init } from "../src/runtime/init.js";
import { getProvider, setProvider } from "../src/runtime/provider.js";
import { AnthropicProvider } from "../src/runtime/anthropic-provider.js";

beforeEach(() => {
  // Reset provider to null
  setProvider(null as any);
});

describe("init()", () => {
  it("creates an AnthropicProvider with explicit apiKey", () => {
    init({ apiKey: "test-key-123" });
    const provider = getProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("reads apiKey from ANTHROPIC_API_KEY env var", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "env-key-456";
    try {
      init();
      const provider = getProvider();
      expect(provider).toBeInstanceOf(AnthropicProvider);
    } finally {
      if (original !== undefined) {
        process.env.ANTHROPIC_API_KEY = original;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });

  it("throws when no apiKey is available", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => init()).toThrow("No API key provided");
    } finally {
      if (original !== undefined) {
        process.env.ANTHROPIC_API_KEY = original;
      }
    }
  });

  it("accepts a model option", () => {
    init({ apiKey: "test-key", model: "claude-sonnet-4-20250514" });
    const provider = getProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });
});
