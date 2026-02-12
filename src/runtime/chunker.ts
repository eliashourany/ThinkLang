// ─── Types ───────────────────────────────────────────────

export interface TextChunkOptions {
  /** Maximum characters per chunk */
  maxChars?: number;
  /** Approximate maximum tokens per chunk (estimated at ~4 chars per token) */
  maxTokens?: number;
  /** Split strategy */
  strategy?: "paragraph" | "sentence" | "fixed";
  /** Number of characters to overlap between chunks */
  overlap?: number;
}

export interface ArrayChunkOptions {
  /** Maximum items per chunk */
  chunkSize: number;
}

export interface ChunkResult<T> {
  chunks: T[];
  totalChunks: number;
}

// ─── Text Chunking ───────────────────────────────────────

const CHARS_PER_TOKEN = 4;

export function chunkText(text: string, options: TextChunkOptions = {}): ChunkResult<string> {
  const {
    maxChars,
    maxTokens,
    strategy = "paragraph",
    overlap = 0,
  } = options;

  const limit = maxChars ?? (maxTokens ? maxTokens * CHARS_PER_TOKEN : 4000);

  if (text.length <= limit) {
    return { chunks: [text], totalChunks: 1 };
  }

  let chunks: string[];

  switch (strategy) {
    case "paragraph":
      chunks = chunkByParagraph(text, limit, overlap);
      break;
    case "sentence":
      chunks = chunkBySentence(text, limit, overlap);
      break;
    case "fixed":
      chunks = chunkFixed(text, limit, overlap);
      break;
    default:
      chunks = chunkByParagraph(text, limit, overlap);
  }

  return { chunks, totalChunks: chunks.length };
}

function chunkByParagraph(text: string, limit: number, overlap: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  return mergeSegments(paragraphs, limit, overlap, "\n\n");
}

function chunkBySentence(text: string, limit: number, overlap: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  return mergeSegments(sentences, limit, overlap, " ");
}

function chunkFixed(text: string, limit: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + limit, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
    if (end === text.length) break;
  }

  return chunks;
}

/** Merge small segments into chunks that fit within the limit */
function mergeSegments(segments: string[], limit: number, overlap: number, joiner: string): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // If a single segment exceeds the limit, split it with fixed strategy
    if (trimmed.length > limit) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      const subChunks = chunkFixed(trimmed, limit, overlap);
      chunks.push(...subChunks);
      continue;
    }

    const candidate = current ? current + joiner + trimmed : trimmed;
    if (candidate.length <= limit) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current.trim());
      }
      // Apply overlap: include tail of previous chunk
      if (overlap > 0 && current) {
        const overlapText = current.slice(-overlap);
        current = overlapText + joiner + trimmed;
      } else {
        current = trimmed;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ─── Array Chunking ──────────────────────────────────────

export function chunkArray<T>(items: T[], options: ArrayChunkOptions): ChunkResult<T[]> {
  const { chunkSize } = options;

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be positive");
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return { chunks, totalChunks: chunks.length };
}

// ─── Convenience ─────────────────────────────────────────

/** Estimate token count for a string (approximate) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
