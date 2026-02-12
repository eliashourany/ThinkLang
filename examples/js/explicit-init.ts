// Explicit initialization with init()
// Run: npx tsx examples/js/explicit-init.ts

import { init, think } from "thinklang";

// Explicitly configure with an API key and model
init({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-5-20250929",
});

const result = await think<string>({
  prompt: "What is 2 + 2? Reply with just the number.",
  jsonSchema: { type: "string" },
});

console.log("Result:", result);
