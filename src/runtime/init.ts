import { AnthropicProvider } from "./anthropic-provider.js";
import { setProvider } from "./provider.js";

export interface InitOptions {
  apiKey?: string;
  model?: string;
}

export function init(options: InitOptions = {}): void {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No API key provided. Pass { apiKey } to init() or set the ANTHROPIC_API_KEY environment variable."
    );
  }
  setProvider(new AnthropicProvider(apiKey, options.model));
}
