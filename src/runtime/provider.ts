import { AnthropicProvider } from "./anthropic-provider.js";

export interface CompleteOptions {
  systemPrompt: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  schemaName?: string;
  model?: string;
  maxTokens?: number;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface CompleteResult {
  data: unknown;
  usage: UsageInfo;
  model: string;
}

export interface ModelProvider {
  complete(options: CompleteOptions): Promise<CompleteResult>;
}

let currentProvider: ModelProvider | null = null;

export function setProvider(provider: ModelProvider): void {
  currentProvider = provider;
}

export function getProvider(): ModelProvider {
  if (!currentProvider) {
    // Auto-init from environment if ANTHROPIC_API_KEY is set
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      currentProvider = new AnthropicProvider(apiKey);
      return currentProvider;
    }
    throw new Error(
      "No ModelProvider configured. Set ANTHROPIC_API_KEY in environment or call init()."
    );
  }
  return currentProvider;
}
