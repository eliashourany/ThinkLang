// Using Zod schemas for type-safe structured output
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/js/with-zod.ts

import { z } from "zod";
import { think, zodSchema } from "thinklang";

// Define your output type with Zod
const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
  explanation: z.string(),
});

// zodSchema() converts the Zod type to a JSON schema and carries the type
const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of: 'This is the best product I have ever used!'",
  ...zodSchema(Sentiment),
});

console.log(`Sentiment: ${result.label} (${result.score})`);
console.log(`Explanation: ${result.explanation}`);
