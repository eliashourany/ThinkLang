import type { ModelProvider } from "./provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { OpenAIProvider } from "./providers/openai-provider.js";
import { GeminiProvider } from "./providers/gemini-provider.js";
import { OllamaProvider } from "./providers/ollama-provider.js";

export interface ProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export type ProviderFactory = (options: ProviderOptions) => ModelProvider;

const registry = new Map<string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  registry.set(name, factory);
}

export function createProvider(name: string, options: ProviderOptions = {}): ModelProvider {
  const factory = registry.get(name);
  if (!factory) {
    const available = Array.from(registry.keys()).join(", ");
    throw new Error(
      `Unknown provider "${name}". Available providers: ${available || "none"}. ` +
      `Register one with registerProvider() or pass a ModelProvider instance to init().`
    );
  }
  return factory(options);
}

export function getRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}

// ─── Built-in provider registrations ─────────────────────

registerProvider("anthropic", (options) => {
  return new AnthropicProvider(options.apiKey, options.model);
});

registerProvider("openai", (options) => {
  return new OpenAIProvider(options.apiKey, options.model, options.baseUrl);
});

registerProvider("gemini", (options) => {
  return new GeminiProvider(options.apiKey, options.model);
});

registerProvider("ollama", (options) => {
  return new OllamaProvider(options.model, options.baseUrl);
});
