// Using different LLM providers
// Run: npx tsx examples/js/multi-provider.ts

import {
  init,
  think,
  registerProvider,
  type ModelProvider,
  type CompleteOptions,
  type CompleteResult,
} from "thinklang";

// ── Option 1: Use Anthropic (default) ──────────────────
// Just set ANTHROPIC_API_KEY env var, no init needed
// const result = await think<string>({ prompt: "Hello", jsonSchema: { type: "string" } });

// ── Option 2: Use OpenAI ───────────────────────────────
// Requires: npm install openai
// init({ provider: "openai", apiKey: "sk-..." });

// ── Option 3: Use Gemini ───────────────────────────────
// Requires: npm install @google/generative-ai
// init({ provider: "gemini", apiKey: "AI..." });

// ── Option 4: Use Ollama (local) ───────────────────────
// Requires: Ollama running locally
// init({ provider: "ollama" });

// ── Option 5: Custom provider ──────────────────────────
class EchoProvider implements ModelProvider {
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    console.log("Provider received prompt:", options.userMessage.slice(0, 80));
    return {
      data: { message: "Hello from custom provider!" },
      usage: { inputTokens: 10, outputTokens: 5 },
      model: "echo-v1",
    };
  }
}

// Pass directly to init
init({ provider: new EchoProvider() });

const result = await think<{ message: string }>({
  prompt: "Say hello",
  jsonSchema: {
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
    additionalProperties: false,
  },
});

console.log("Result:", result.message);

// ── Option 6: Register a named provider ────────────────
registerProvider("echo", () => new EchoProvider());
// Now others can use: init({ provider: "echo" })
