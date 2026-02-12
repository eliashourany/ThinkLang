# Providers

ThinkLang is model-agnostic. It supports multiple LLM providers out of the box, and you can plug in custom providers of your own.

## Supported Providers

| Provider | Package | Env Var | Default Model |
|---|---|---|---|
| Anthropic | `@anthropic-ai/sdk` (bundled) | `ANTHROPIC_API_KEY` | `claude-opus-4-6` |
| OpenAI | `openai` (optional peer dep) | `OPENAI_API_KEY` | `gpt-4o` |
| Google Gemini | `@google/generative-ai` (optional peer dep) | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| Ollama | none (uses HTTP API) | `OLLAMA_BASE_URL` | `llama3` |

Anthropic's SDK is bundled with ThinkLang. For OpenAI or Google Gemini, install the corresponding SDK as a peer dependency:

```bash
npm install openai                    # for OpenAI
npm install @google/generative-ai     # for Google Gemini
```

Ollama requires no extra package --- just a running Ollama server.

## Auto-Detection

ThinkLang automatically detects which provider to use. No `init()` call is needed if you have the right environment variable set.

The runtime checks environment variables in this order:

1. `ANTHROPIC_API_KEY` --- selects Anthropic
2. `OPENAI_API_KEY` --- selects OpenAI
3. `GEMINI_API_KEY` --- selects Google Gemini
4. `OLLAMA_BASE_URL` --- selects Ollama

The first match wins. If you have multiple API keys set, the one earliest in this list takes priority.

When you pass an API key directly (via the library API), the runtime also detects the provider from the key's prefix:

| Prefix | Provider |
|---|---|
| `sk-ant-` | Anthropic |
| `sk-` | OpenAI |
| `AI` | Google Gemini |

If no provider can be detected, Anthropic is used as the default.

## Explicit Configuration

Use `init()` when you need to configure the provider, API key, or model explicitly:

```typescript
import { init, think } from "thinklang";

// Anthropic (default)
init({ apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514" });

// OpenAI
init({ provider: "openai", apiKey: "sk-..." });

// Gemini
init({ provider: "gemini", apiKey: "AI...", model: "gemini-2.5-pro" });

// Ollama (no API key)
init({ provider: "ollama", baseUrl: "http://my-server:11434", model: "mistral" });

// Custom ModelProvider instance
init({ provider: myCustomProvider });
```

If you don't call `init()`, the runtime auto-initializes from environment variables on first use:

```typescript
import { think } from "thinklang";

// Just set ANTHROPIC_API_KEY (or OPENAI_API_KEY, etc.) in your environment
const result = await think<string>({
  prompt: "This works with zero configuration",
  jsonSchema: { type: "string" },
});
```

## Custom Providers

You can implement the `ModelProvider` interface to use any LLM backend:

```typescript
import {
  setProvider,
  think,
  type ModelProvider,
  type CompleteOptions,
  type CompleteResult,
} from "thinklang";

class MyProvider implements ModelProvider {
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    // options.systemPrompt  — system prompt string
    // options.userMessage   — the user's prompt
    // options.jsonSchema    — JSON Schema for structured output (optional)
    // options.schemaName    — name for the schema (optional)
    // options.model         — model override (optional)
    // options.maxTokens     — token limit (optional)
    // options.tools         — tool definitions for agent mode (optional)
    // options.messages      — conversation history for agent mode (optional)

    const data = await myLLM.generate(options.userMessage, options.jsonSchema);

    return {
      data,
      usage: { inputTokens: 0, outputTokens: 0 },
      model: "my-model",
      // For agent tool calling support, also return:
      // toolCalls: [{ id, name, input }],
      // stopReason: "end_turn" | "tool_use" | "max_tokens",
    };
  }
}

setProvider(new MyProvider());

const result = await think<string>({
  prompt: "Hello from my custom provider",
  jsonSchema: { type: "string" },
});
```

### Registry-Based Approach

Register a provider factory so it can be referenced by name:

```typescript
import { registerProvider, init } from "thinklang";

registerProvider("my-llm", (options) => {
  return new MyProvider(options.apiKey, options.model);
});

// Now you can use it by name
init({ provider: "my-llm", apiKey: "my-key" });
```

The factory receives a `ProviderOptions` object with `apiKey`, `model`, and `baseUrl` fields. Once registered, the provider name works everywhere --- including in `init()` calls.

## Custom Pricing

ThinkLang's cost tracking includes built-in pricing for models from Anthropic, OpenAI, and Google. If you use a custom model or a model not in the built-in table, register pricing so costs are tracked accurately:

```typescript
import { registerPricing } from "thinklang";

// Pricing is per million tokens (USD)
registerPricing("my-custom-model", { input: 5, output: 20 });
```

This means the model costs $5 per million input tokens and $20 per million output tokens.

### Built-in Pricing Table

For reference, here are the models with built-in pricing:

**Anthropic**

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---|---|
| `claude-opus-4-6` | $15 | $75 |
| `claude-sonnet-4-5-20250929` | $3 | $15 |
| `claude-haiku-4-5-20251001` | $0.80 | $4 |

**OpenAI**

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---|---|
| `gpt-4o` | $2.50 | $10 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `gpt-4.1` | $2 | $8 |
| `gpt-4.1-mini` | $0.40 | $1.60 |
| `gpt-4.1-nano` | $0.10 | $0.40 |
| `o3` | $10 | $40 |
| `o4-mini` | $1.10 | $4.40 |

**Google**

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---|---|
| `gemini-2.0-flash` | $0.10 | $0.40 |
| `gemini-2.5-pro` | $1.25 | $10 |
| `gemini-2.5-flash` | $0.15 | $0.60 |

::: info
Models not in this table use a default estimate of $3/$15 per million tokens (input/output). Register custom pricing with `registerPricing()` to get accurate cost reports.
:::

## Provider Feature Support

All four built-in providers support the full ThinkLang feature set:

| Feature | Anthropic | OpenAI | Gemini | Ollama |
|---|---|---|---|---|
| Structured output (JSON Schema) | Yes | Yes | Yes | Yes |
| Tool calling (agents) | Yes | Yes | Yes | Yes |
| Cost tracking | Yes | Yes | Yes | Yes |

::: tip Ollama note
Ollama's structured output support depends on the specific model you run. Most recent models (Llama 3, Mistral, etc.) support JSON mode.
:::

## Environment Configuration (CLI)

If you also use the ThinkLang CLI to run `.tl` files, provider selection works the same way --- set the appropriate environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
thinklang run app.tl

# Override the default model
export THINKLANG_MODEL=gpt-4.1
thinklang run app.tl
```

## Next Steps

- [Quick Start](./quick-start.md) for getting started with the library
- [Core Functions](./core-functions.md) for think, infer, and reason
- [Cost Tracking (Language Guide)](/guide/cost-tracking) for monitoring usage
- [Runtime API Reference](/reference/runtime-api) for complete type definitions
