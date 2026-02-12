import { describe, it, expect, beforeEach } from "vitest";
import { getProvider, setProvider } from "../src/runtime/provider.js";
import { AnthropicProvider } from "../src/runtime/anthropic-provider.js";

beforeEach(() => {
  // Reset provider to null before each test
  setProvider(null as any);
});

describe("auto-init provider", () => {
  it("auto-initializes from ANTHROPIC_API_KEY env var", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-auto-init-key";
    try {
      // Should not throw — auto-inits from env
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

  it("throws when no env var and no provider set", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => getProvider()).toThrow("No ModelProvider configured");
    } finally {
      if (original !== undefined) {
        process.env.ANTHROPIC_API_KEY = original;
      }
    }
  });

  it("uses explicitly set provider over auto-init", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "env-key";
    try {
      const customProvider = new AnthropicProvider("explicit-key");
      setProvider(customProvider);
      const provider = getProvider();
      expect(provider).toBe(customProvider);
    } finally {
      if (original !== undefined) {
        process.env.ANTHROPIC_API_KEY = original;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });
});
