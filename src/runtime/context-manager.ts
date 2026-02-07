export interface ContextManagerOptions {
  maxTokens?: number;
  charsPerToken?: number;
}

export function truncateContext(
  context: Record<string, unknown>,
  options: ContextManagerOptions = {}
): Record<string, unknown> {
  const { maxTokens = 100_000, charsPerToken = 4 } = options;
  const maxChars = maxTokens * charsPerToken;

  const serialized = JSON.stringify(context);
  if (serialized.length <= maxChars) {
    return context;
  }

  console.warn(
    `[ThinkLang] Context exceeds token limit (~${Math.ceil(serialized.length / charsPerToken)} tokens). Truncating...`
  );

  // Sort entries by serialized length (longest first) and truncate them
  const entries = Object.entries(context);
  const sizes = entries.map(([k, v]) => ({
    key: k,
    value: v,
    size: JSON.stringify(v).length,
  }));
  sizes.sort((a, b) => b.size - a.size);

  const result: Record<string, unknown> = {};
  let totalChars = 2; // '{' and '}'

  for (const { key, value } of sizes) {
    const entryStr = JSON.stringify({ [key]: value });
    const entrySize = entryStr.length;

    if (totalChars + entrySize <= maxChars) {
      result[key] = value;
      totalChars += entrySize;
    } else {
      // Truncate string values
      const remaining = maxChars - totalChars - key.length - 10;
      if (remaining > 50 && typeof value === "string") {
        result[key] = value.slice(0, remaining) + "... [truncated]";
        totalChars += remaining + key.length + 10;
      }
    }
  }

  return result;
}

export function excludeFromContext(
  context: Record<string, unknown>,
  exclusions: string[]
): Record<string, unknown> {
  const result = { ...context };
  for (const key of exclusions) {
    delete result[key];
  }
  return result;
}
