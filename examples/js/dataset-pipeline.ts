// Dataset pipeline — lazy, chainable collection processing with AI
import { z } from "zod";
import { init, Dataset, think, zodSchema } from "thinklang";

// Auto-init from env vars, or explicit:
// init({ provider: "anthropic", apiKey: "sk-ant-..." });

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
  "Exceeded my expectations",
  "Would not recommend",
  "Perfect for what I needed",
];

// Build a lazy pipeline, then execute
const positiveReviews = await Dataset.from(reviews)
  // Classify each review via AI
  .map(async (review) =>
    think<z.infer<typeof Sentiment>>({
      prompt: `Classify the sentiment of: "${review}"`,
      ...zodSchema(Sentiment),
    })
  )
  // Keep only positive results
  .filter(async (sentiment) => sentiment.label === "positive")
  .execute({ maxConcurrency: 3 });

console.log("Positive reviews:", positiveReviews.toArray());
console.log(`Found ${positiveReviews.length} positive reviews out of ${reviews.length}`);

// Reduce example: summarize items
const sum = await Dataset.from([10, 20, 30, 40, 50])
  .reduce(async (acc, item) => acc + item, 0);

console.log("Sum:", sum); // 150
