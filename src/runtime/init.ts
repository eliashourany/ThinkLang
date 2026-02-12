import { setProvider, type ModelProvider } from "./provider.js";
import { createProvider, type ProviderOptions } from "./provider-registry.js";

export interface InitOptions {
  provider?: string | ModelProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export function init(options: InitOptions = {}): void {
  if (typeof options.provider === "object" && options.provider !== null) {
    // Custom ModelProvider instance passed directly
    setProvider(options.provider);
    return;
  }

  const providerName = typeof options.provider === "string"
    ? options.provider
    : detectProvider(options);

  const providerOpts: ProviderOptions = {
    apiKey: options.apiKey,
    model: options.model,
    baseUrl: options.baseUrl,
  };

  // Resolve API key from env if not provided
  if (!providerOpts.apiKey) {
    switch (providerName) {
      case "anthropic":
        providerOpts.apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      case "openai":
        providerOpts.apiKey = process.env.OPENAI_API_KEY;
        break;
      case "gemini":
        providerOpts.apiKey = process.env.GEMINI_API_KEY;
        break;
      // ollama doesn't need an API key
    }
  }

  if (!providerOpts.apiKey && providerName !== "ollama") {
    const envVar = providerName === "anthropic" ? "ANTHROPIC_API_KEY"
      : providerName === "openai" ? "OPENAI_API_KEY"
      : providerName === "gemini" ? "GEMINI_API_KEY"
      : `${providerName.toUpperCase()}_API_KEY`;
    throw new Error(
      `No API key provided for "${providerName}". Pass { apiKey } to init() or set the ${envVar} environment variable.`
    );
  }

  setProvider(createProvider(providerName, providerOpts));
}

function detectProvider(options: InitOptions): string {
  // Detect from explicitly passed API key format
  if (options.apiKey) {
    if (options.apiKey.startsWith("sk-ant-")) return "anthropic";
    if (options.apiKey.startsWith("sk-")) return "openai";
    if (options.apiKey.startsWith("AI")) return "gemini";
  }

  // Detect from environment variables
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OLLAMA_BASE_URL) return "ollama";

  return "anthropic"; // default
}
