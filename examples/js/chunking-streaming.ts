// Chunking and streaming — process large text through AI in chunks
import { init, chunkText, chunkArray, streamThink, collectStream, estimateTokens } from "thinklang";

// Auto-init from env vars

// ── Text Chunking ──────────────────────────────────────────

const longArticle = `
Artificial intelligence has transformed many industries. Healthcare uses AI for diagnosis.
Finance uses AI for fraud detection. Education is being personalized through AI tutors.

The environmental impact of AI is a growing concern. Training large models requires
significant computational resources and energy. Researchers are working on more efficient
architectures and training methods.

AI ethics is another critical area. Questions about bias, fairness, and accountability
are at the forefront of AI research. Regulatory frameworks are being developed worldwide.

The future of AI holds both promise and challenges. As models become more capable,
society must grapple with questions about automation, employment, and human-AI collaboration.
`;

// Chunk by paragraph, staying within token limits
const { chunks, totalChunks } = chunkText(longArticle, {
  maxTokens: 100,
  strategy: "paragraph",
  overlap: 20,
});

console.log(`Split into ${totalChunks} chunks`);
console.log(`Estimated tokens per chunk: ${chunks.map(c => estimateTokens(c))}`);

// ── Streaming Think ────────────────────────────────────────

// Process each chunk via AI, yielding results as they complete
for await (const event of streamThink<string>({
  prompt: longArticle,
  jsonSchema: { type: "string" },
  chunkOptions: { maxTokens: 100, strategy: "paragraph" },
})) {
  console.log(`Chunk ${event.index + 1}/${event.totalChunks}: ${event.data}`);
}

// Or collect all results at once
const allResults = await collectStream(
  streamThink<string>({
    prompt: longArticle,
    jsonSchema: { type: "string" },
    chunkOptions: { maxTokens: 100, strategy: "paragraph" },
  })
);
console.log("All chunk results:", allResults);

// ── Array Chunking ─────────────────────────────────────────

const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
const { chunks: itemChunks } = chunkArray(items, { chunkSize: 10 });
console.log(`${items.length} items split into ${itemChunks.length} batches of 10`);
