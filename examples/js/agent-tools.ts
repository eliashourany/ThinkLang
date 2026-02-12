// Using agents and tools from JavaScript/TypeScript
// Run: npx tsx examples/js/agent-tools.ts

import { z } from "zod";
import { agent, defineTool, zodSchema } from "thinklang";

// Define tools with Zod schemas for type-safe input
const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation for relevant information",
  input: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // In a real app, this would search a database or index
    console.log(`Searching for: ${query}`);
    return `Documentation about "${query}": ThinkLang is an AI-native language...`;
  },
});

const calculator = defineTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  input: z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  execute: async ({ expression }) => {
    // Simple eval for demo purposes
    return `Result: ${expression} = 42`;
  },
});

// Run an agent with tools
const result = await agent<{ answer: string; sources: string[] }>({
  prompt: "How does ThinkLang handle type safety? Include relevant sources.",
  tools: [searchDocs, calculator],
  maxTurns: 5,
  ...zodSchema(z.object({
    answer: z.string(),
    sources: z.array(z.string()),
  })),
  onToolCall: (call) => console.log(`Tool called: ${call.name}`),
  onToolResult: (result) => console.log(`Tool result: ${JSON.stringify(result.output).slice(0, 100)}`),
});

console.log("\nAnswer:", result.data.answer);
console.log("Sources:", result.data.sources);
console.log(`Completed in ${result.turns} turns`);
console.log(`Tokens: ${result.totalUsage.inputTokens} in / ${result.totalUsage.outputTokens} out`);
