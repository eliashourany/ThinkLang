// Monitoring token usage and costs
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/js/cost-tracking.ts

import { think, infer, globalCostTracker } from "thinklang";

// Make some AI calls
const greeting = await think<string>({
  prompt: "Say hello briefly",
  jsonSchema: { type: "string" },
});
console.log("Greeting:", greeting);

const language = await infer<string>({
  value: "Bonjour le monde",
  hint: "Detect the language",
  jsonSchema: { type: "string" },
});
console.log("Language:", language);

// Check the cost summary
const summary = globalCostTracker.getSummary();
console.log("\n--- Cost Summary ---");
console.log(`Total calls: ${summary.totalCalls}`);
console.log(`Total tokens: ${summary.totalInputTokens} in / ${summary.totalOutputTokens} out`);
console.log(`Total cost: $${summary.totalCostUsd.toFixed(4)}`);

// Breakdown by operation
console.log("\nBy operation:");
for (const [op, stats] of summary.byOperation) {
  console.log(`  ${op}: ${stats.calls} calls, $${stats.costUsd.toFixed(4)}`);
}
