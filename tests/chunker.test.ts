import { describe, it, expect } from "vitest";
import { chunkText, chunkArray, estimateTokens } from "../src/runtime/chunker.js";

describe("chunkText()", () => {
  it("returns single chunk for short text", () => {
    const result = chunkText("Hello world", { maxChars: 100 });
    expect(result.totalChunks).toBe(1);
    expect(result.chunks[0]).toBe("Hello world");
  });

  it("splits by paragraph", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
    const result = chunkText(text, { maxChars: 25, strategy: "paragraph" });
    expect(result.totalChunks).toBeGreaterThan(1);
    expect(result.chunks.every(c => c.length > 0)).toBe(true);
  });

  it("splits by sentence", () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const result = chunkText(text, { maxChars: 35, strategy: "sentence" });
    expect(result.totalChunks).toBeGreaterThan(1);
  });

  it("splits by fixed size", () => {
    const text = "a".repeat(100);
    const result = chunkText(text, { maxChars: 30, strategy: "fixed" });
    expect(result.totalChunks).toBe(4); // ceil(100/30)
    expect(result.chunks[0].length).toBe(30);
  });

  it("supports overlap in fixed strategy", () => {
    const text = "a".repeat(100);
    const result = chunkText(text, { maxChars: 30, strategy: "fixed", overlap: 10 });
    expect(result.totalChunks).toBeGreaterThan(3);
    // Chunks should overlap
    expect(result.chunks.every(c => c.length <= 30)).toBe(true);
  });

  it("uses maxTokens when maxChars not specified", () => {
    const text = "a".repeat(100);
    const result = chunkText(text, { maxTokens: 10 }); // 10 tokens ≈ 40 chars
    expect(result.totalChunks).toBeGreaterThan(1);
  });

  it("uses default limit when no options provided", () => {
    const shortText = "short";
    const result = chunkText(shortText);
    expect(result.totalChunks).toBe(1);
  });
});

describe("chunkArray()", () => {
  it("splits array into chunks of given size", () => {
    const result = chunkArray([1, 2, 3, 4, 5], { chunkSize: 2 });
    expect(result.totalChunks).toBe(3);
    expect(result.chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when array is smaller than chunkSize", () => {
    const result = chunkArray([1, 2], { chunkSize: 10 });
    expect(result.totalChunks).toBe(1);
    expect(result.chunks).toEqual([[1, 2]]);
  });

  it("handles empty array", () => {
    const result = chunkArray([], { chunkSize: 5 });
    expect(result.totalChunks).toBe(0);
    expect(result.chunks).toEqual([]);
  });

  it("throws on invalid chunkSize", () => {
    expect(() => chunkArray([1], { chunkSize: 0 })).toThrow("chunkSize must be positive");
  });
});

describe("estimateTokens()", () => {
  it("estimates token count", () => {
    expect(estimateTokens("hello")).toBe(2); // 5 chars / 4
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});
