// Example 21: Reduce Think — Summarize multiple items into one
// Uses tree-reduction to aggregate large collections via LLM

type Summary {
  @description("A concise summary of the combined content")
  text: string
  @description("Number of items summarized")
  itemCount: int
}

let paragraphs = [
  "ThinkLang is an AI-native programming language.",
  "It compiles to TypeScript that calls an LLM runtime.",
  "The language supports multiple providers including Anthropic and OpenAI.",
  "Big data features allow batch processing of collections.",
  "The Dataset API provides lazy, chainable collection operations."
]

// Reduce all paragraphs into a single summary
let summary = reduce_think<Summary>(paragraphs, "Combine these paragraphs into a coherent summary")
  batch_size: 3

print summary
