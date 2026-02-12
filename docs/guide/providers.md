# Provider System

ThinkLang supports multiple AI providers out of the box. You can use Anthropic, OpenAI, Google Gemini, or local models via Ollama -- and you can plug in custom providers of your own.

## Supported Providers

| Provider | Package | Environment Variable | Default Model |
|---|---|---|---|
| Anthropic | `@anthropic-ai/sdk` (included) | `ANTHROPIC_API_KEY` | `claude-opus-4-6` |
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4o` |
| Google Gemini | `@google/generative-ai` | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| Ollama | none (uses HTTP API) | `OLLAMA_BASE_URL` | `llama3` |

For providers other than Anthropic, install the corresponding SDK package:

```bash
# For OpenAI
npm install openai

# For Google Gemini
npm install @google/generative-ai

# Ollama requires no extra package — just a running Ollama server
```

## Auto-Detection

ThinkLang automatically detects which provider to use. No explicit configuration is required if you have the right environment variable set.

### Detection from Environment Variables

The runtime checks environment variables in this order:

1. `ANTHROPIC_API_KEY` -- selects Anthropic
2. `OPENAI_API_KEY` -- selects OpenAI
3. `GEMINI_API_KEY` -- selects Google Gemini
4. `OLLAMA_BASE_URL` -- selects Ollama

The first match wins. If you have multiple API keys set, the one earliest in this list takes priority.

### Detection from API Key Format

When you pass an API key directly (via the library API), the runtime also detects the provider from the key's prefix:

| Prefix | Provider |
|---|---|
| `sk-ant-` | Anthropic |
| `sk-` | OpenAI |
| `AI` | Google Gemini |

If no provider can be detected, Anthropic is used as the default.

## Explicit Configuration (Language)

When writing `.tl` programs, set the appropriate environment variable before running:

```bash
# Use Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-your-key-here
thinklang run app.tl

# Use OpenAI instead
export OPENAI_API_KEY=sk-your-key-here
thinklang run app.tl

# Use Google Gemini
export GEMINI_API_KEY=AIyour-key-here
thinklang run app.tl

# Use a local Ollama server
export OLLAMA_BASE_URL=http://localhost:11434
thinklang run app.tl
```

You can override the default model for any provider with `THINKLANG_MODEL`:

```bash
export OPENAI_API_KEY=sk-your-key-here
export THINKLANG_MODEL=gpt-4.1
thinklang run app.tl
```

## Explicit Configuration (Library)

When using ThinkLang as a JavaScript/TypeScript library, call `init()` to configure the provider explicitly.

### Select a provider by name

```typescript
import { init, think } from "thinklang";

init({ provider: "openai", apiKey: "sk-your-key-here" });

const result = await think<string>({
  prompt: "Hello from OpenAI",
  jsonSchema: { type: "string" },
});
```

### Specify a model

```typescript
init({
  provider: "openai",
  apiKey: "sk-your-key-here",
  model: "gpt-4.1",
});
```

### Use Google Gemini

```typescript
init({
  provider: "gemini",
  apiKey: "AIyour-key-here",
  model: "gemini-2.5-pro",
});
```

### Use Ollama (no API key required)

```typescript
init({ provider: "ollama" });

// Or with a custom base URL and model
init({
  provider: "ollama",
  baseUrl: "http://my-server:11434",
  model: "mistral",
});
```

### Pass a custom provider instance

```typescript
init({ provider: myCustomProvider });
```

When you pass an object that implements the `ModelProvider` interface, it is used directly. See [Custom Providers](#custom-providers) below.

### Auto-init (no `init()` call)

If you do not call `init()`, the runtime auto-initializes from environment variables on the first AI call:

```typescript
import { think } from "thinklang";

// Just set ANTHROPIC_API_KEY (or OPENAI_API_KEY, etc.) in your environment
const result = await think<string>({
  prompt: "This works with zero configuration",
  jsonSchema: { type: "string" },
});
```

## Custom Providers

You can implement the `ModelProvider` interface to use any LLM backend.

### The ModelProvider Interface

```typescript
import type { ModelProvider, CompleteOptions, CompleteResult } from "thinklang";

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

    const response = await myLLMService.generate({
      prompt: options.userMessage,
      system: options.systemPrompt,
      schema: options.jsonSchema,
    });

    return {
      data: response.parsed,                              // the parsed result
      usage: {
        inputTokens: response.promptTokens,
        outputTokens: response.completionTokens,
      },
      model: "my-model-v1",
      // For agent tool calling support, also return:
      // toolCalls: [{ id, name, input }],
      // stopReason: "end_turn" | "tool_use" | "max_tokens",
    };
  }
}
```

### Using a Custom Provider Directly

Pass the instance to `init()`:

```typescript
import { init, think } from "thinklang";

const provider = new MyProvider();
init({ provider });

const result = await think<string>({
  prompt: "Hello from my custom provider",
  jsonSchema: { type: "string" },
});
```

Or use `setProvider()` for lower-level control:

```typescript
import { setProvider, think } from "thinklang";

setProvider(new MyProvider());
```

### Registry-Based Approach

Register a provider factory so it can be referenced by name:

```typescript
import { registerProvider, init } from "thinklang";

registerProvider("my-provider", (options) => {
  return new MyProvider(options.apiKey, options.model);
});

// Now you can use it by name
init({ provider: "my-provider", apiKey: "my-key", model: "my-model-v2" });
```

The factory receives a `ProviderOptions` object with `apiKey`, `model`, and `baseUrl` fields.

Once registered, the provider name works everywhere -- including auto-detection if you add your own detection logic.

## Custom Pricing

ThinkLang's [cost tracking](./cost-tracking.md) includes built-in pricing for models from Anthropic, OpenAI, and Google. If you use a custom model or a model that is not in the built-in table, you can register pricing so costs are tracked accurately.

### Register Pricing

```typescript
import { registerPricing } from "thinklang";

// Pricing is per million tokens (USD)
registerPricing("my-custom-model", { input: 5, output: 20 });
```

This means the model costs $5 per million input tokens and $20 per million output tokens.

### Built-in Pricing Table

For reference, here are the models with built-in pricing:

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---|---|
| `claude-opus-4-6` | 15 | 75 |
| `claude-sonnet-4-5-20250929` | 3 | 15 |
| `claude-haiku-4-5-20251001` | 0.8 | 4 |
| `gpt-4o` | 2.5 | 10 |
| `gpt-4o-mini` | 0.15 | 0.6 |
| `gpt-4.1` | 2 | 8 |
| `gpt-4.1-mini` | 0.4 | 1.6 |
| `gpt-4.1-nano` | 0.1 | 0.4 |
| `o3` | 10 | 40 |
| `o4-mini` | 1.1 | 4.4 |
| `gemini-2.0-flash` | 0.1 | 0.4 |
| `gemini-2.5-pro` | 1.25 | 10 |
| `gemini-2.5-flash` | 0.15 | 0.6 |

Models not in this table use a default estimate of $3/$15 per million tokens (input/output). Register custom pricing to get accurate cost reports.

## Provider Feature Support

All four built-in providers support the full ThinkLang feature set:

| Feature | Anthropic | OpenAI | Gemini | Ollama |
|---|---|---|---|---|
| Structured output (JSON Schema) | Yes | Yes | Yes | Yes |
| Tool calling (agents) | Yes | Yes | Yes | Yes |
| Cost tracking | Yes | Yes | Yes | Yes |

Ollama's structured output support depends on the specific model you run. Most recent models (Llama 3, Mistral, etc.) support JSON mode.

## Next Steps

- Learn about [Cost Tracking](./cost-tracking.md) for monitoring AI usage across providers
- See [Library Usage](./library-usage.md) for the full JS/TS API
- Explore [Agents & Tools](./agents.md) for agentic workflows with tool calling
