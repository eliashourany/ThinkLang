// Batch processing — process multiple items through AI in parallel
import { z } from "zod";
import { init, batch, mapThink, zodSchema, think } from "thinklang";

// Auto-init from env vars, or explicit:
// init({ provider: "openai", apiKey: "sk-..." });

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const reviews = [
  "Great product, love it!",
  "Terrible experience, never again",
  "It was okay, nothing special",
  "Best purchase I ever made",
  "Completely broken on arrival",
];

// Option 1: batch() with custom processor
const result = await batch({
  items: reviews,
  processor: async (review) => {
    return think<z.infer<typeof Sentiment>>({
      prompt: `Classify the sentiment of: "${review}"`,
      ...zodSchema(Sentiment),
    });
  },
  maxConcurrency: 3,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total}`);
  },
});

console.log("Results:", result.results.map(r => r.data));
console.log(`Cost: $${result.totalCostUsd.toFixed(4)}`);

// Option 2: mapThink() — simpler API for common case
const sentiments = await mapThink<typeof reviews[0], z.infer<typeof Sentiment>>({
  items: reviews,
  promptTemplate: (review) => `Classify the sentiment of: "${review}"`,
  ...zodSchema(Sentiment),
  maxConcurrency: 5,
});

console.log("Sentiments:", sentiments.results);
