import { think, type ThinkOptions } from "./think.js";
import { infer, type InferOptions } from "./infer.js";
import { chunkText, type TextChunkOptions } from "./chunker.js";

// ─── Types ───────────────────────────────────────────────

export interface StreamThinkOptions extends Omit<ThinkOptions, "prompt"> {
  /** The full prompt text to process in chunks */
  prompt: string;
  /** Chunking options for splitting the prompt input */
  chunkOptions?: TextChunkOptions;
}

export interface StreamInferOptions extends Omit<InferOptions, "value"> {
  /** Array of values to process one at a time */
  values: unknown[];
}

export interface StreamEvent<T> {
  index: number;
  data: T;
  totalChunks: number;
}

// ─── Streaming Think ─────────────────────────────────────

/**
 * Process a large prompt by chunking and yielding results as they complete.
 * Each chunk is processed sequentially via think(), yielding partial results.
 */
export async function* streamThink<T = unknown>(
  options: StreamThinkOptions,
): AsyncGenerator<StreamEvent<T>, void, undefined> {
  const { prompt, chunkOptions, ...thinkOpts } = options;

  const { chunks } = chunkText(prompt, chunkOptions);

  for (let i = 0; i < chunks.length; i++) {
    const result = await think<T>({
      ...thinkOpts,
      prompt: chunks[i],
      context: {
        ...thinkOpts.context,
        __chunk_index: i,
        __total_chunks: chunks.length,
      },
    });

    yield { index: i, data: result, totalChunks: chunks.length };
  }
}

// ─── Streaming Infer ─────────────────────────────────────

/**
 * Process an array of values one at a time via infer(), yielding each result.
 */
export async function* streamInfer<T = unknown>(
  options: StreamInferOptions,
): AsyncGenerator<StreamEvent<T>, void, undefined> {
  const { values, ...inferOpts } = options;

  for (let i = 0; i < values.length; i++) {
    const result = await infer<T>({
      ...inferOpts,
      value: values[i],
    });

    yield { index: i, data: result, totalChunks: values.length };
  }
}

// ─── Collect Helper ──────────────────────────────────────

/** Collect all items from an async generator into an array */
export async function collectStream<T>(gen: AsyncGenerator<StreamEvent<T>>): Promise<T[]> {
  const results: T[] = [];
  for await (const event of gen) {
    results.push(event.data);
  }
  return results;
}
