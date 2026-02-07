import { createHash } from "crypto";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class ExactMatchCache {
  private store = new Map<string, CacheEntry>();
  private defaultTtlMs: number;
  private enabled: boolean;

  constructor(ttlMs: number = 3600_000) {
    this.defaultTtlMs = ttlMs;
    this.enabled = process.env.THINKLANG_CACHE !== "false";
  }

  private makeKey(prompt: string, context: unknown, schema: unknown): string {
    const data = JSON.stringify({ prompt, context, schema });
    return createHash("sha256").update(data).digest("hex");
  }

  get(prompt: string, context: unknown, schema: unknown): unknown | undefined {
    if (!this.enabled) return undefined;

    const key = this.makeKey(prompt, context, schema);
    const entry = this.store.get(key);

    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(prompt: string, context: unknown, schema: unknown, value: unknown, ttlMs?: number): void {
    if (!this.enabled) return;

    const key = this.makeKey(prompt, context, schema);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton cache instance
export const globalCache = new ExactMatchCache();
