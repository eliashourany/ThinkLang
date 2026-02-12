// Implementing a custom ModelProvider
// Run: npx tsx examples/js/custom-provider.ts

import {
  think,
  setProvider,
  type ModelProvider,
  type CompleteOptions,
  type CompleteResult,
} from "thinklang";

// Create a mock provider for testing or local models
class MockProvider implements ModelProvider {
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    console.log("Received prompt:", options.userMessage);
    console.log("Expected schema:", JSON.stringify(options.jsonSchema, null, 2));

    // Return a hardcoded response matching the schema
    return {
      data: { category: "greeting", confidence: 0.99 },
      usage: { inputTokens: 10, outputTokens: 5 },
      model: "mock-model",
    };
  }
}

// Register the custom provider
setProvider(new MockProvider());

// Now think() will use your custom provider
const result = await think<{ category: string; confidence: number }>({
  prompt: "Classify this text",
  jsonSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      confidence: { type: "number" },
    },
    required: ["category", "confidence"],
    additionalProperties: false,
  },
});

console.log("Result:", result);
