import { ThinkError } from "./errors.js";

export interface RetryOptions {
  attempts: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  fallback?: () => unknown;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { attempts, baseDelayMs = 500, onRetry, fallback } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (onRetry) {
        onRetry(attempt, error);
      }

      if (attempt < attempts) {
        // Exponential backoff
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  if (fallback) {
    return fallback() as T;
  }

  throw lastError ?? new ThinkError("All retry attempts exhausted");
}
