# Agents & Tools

ThinkLang's agentic runtime is fully available from the library. Define tools that the LLM can call, then run an agent loop that orchestrates tool use automatically.

## Defining Tools

Use `defineTool()` to create tools. Accepts Zod schemas or raw JSON Schema for input.

```typescript
import { defineTool } from "thinklang";
import { z } from "zod";

const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation for relevant info",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const results = await docsIndex.search(query);
    return results.map(r => r.title).join("\n");
  },
});
```

## Running an Agent

Use `agent()` to start an agentic loop. The LLM calls tools as needed until it produces a final answer.

```typescript
import { agent, defineTool, zodSchema } from "thinklang";
import { z } from "zod";

const getWeather = defineTool({
  name: "getWeather",
  description: "Get weather for a city",
  input: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather.example/v1/${city}`);
    return res.text();
  },
});

const Report = z.object({
  city: z.string(),
  temperature: z.number(),
  conditions: z.string(),
  recommendation: z.string(),
});

const result = await agent<z.infer<typeof Report>>({
  prompt: "What is the weather in Tokyo? Recommend what to wear.",
  tools: [getWeather],
  ...zodSchema(Report),
  maxTurns: 5,
});

console.log(result.data);             // the Report object
console.log(result.turns);            // how many loop iterations
console.log(result.toolCallHistory);  // full history of tool calls
```

## Agent Options

| Option | Type | Default | Description |
|---|---|---|---|
| `prompt` | `string` | required | The goal for the agent |
| `tools` | `Tool[]` | required | Tools the agent can call |
| `jsonSchema` | `object` | — | JSON Schema for the final output |
| `maxTurns` | `number` | `10` | Maximum loop iterations |
| `guards` | `GuardRule[]` | — | Validate the final output |
| `retryCount` | `number` | — | Retry the entire loop on failure |
| `fallback` | `() => T` | — | Fallback if all retries fail |
| `onToolCall` | `(call) => void` | — | Called before each tool executes |
| `onToolResult` | `(result) => void` | — | Called after each tool executes |
| `abortSignal` | `AbortSignal` | — | Cancel the agent loop |
| `context` | `object` | — | Context data for the agent |
| `model` | `string` | — | Override the default model |

## How the Loop Works

1. The prompt is sent to the LLM along with tool definitions.
2. The LLM either calls one or more tools or returns a final answer.
3. If tools were called, their results are fed back to the LLM.
4. Steps 2-3 repeat until the LLM produces a final answer or the turn limit is reached.
5. The final answer is parsed into the specified type and returned.
6. Throws `AgentMaxTurnsError` if the turn limit is reached without a final answer.

## Built-in Tools

ThinkLang ships with opt-in built-in tools:

```typescript
import { agent, fetchUrl, readFile, writeFile, runCommand } from "thinklang";

const result = await agent({
  prompt: "Read the README and summarize it",
  tools: [readFile],
  jsonSchema: { type: "string" },
  maxTurns: 3,
});
```

| Tool | Description |
|---|---|
| `fetchUrl` | Fetch a URL via HTTP GET |
| `readFile` | Read a local file |
| `writeFile` | Write content to a local file |
| `runCommand` | Run a shell command |

## Observability Hooks

Track what the agent is doing in real time:

```typescript
const result = await agent({
  prompt: "Research this topic",
  tools: [searchDocs],
  jsonSchema: { type: "string" },
  onToolCall: (call) => {
    console.log(`Calling tool: ${call.name}`, call.input);
  },
  onToolResult: (result) => {
    console.log(`Tool ${result.toolName}:`, result.isError ? "ERROR" : "OK");
  },
});
```

## Cancellation

Use `AbortSignal` to cancel a running agent:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000); // 30s timeout

const result = await agent({
  prompt: "Complex research task",
  tools: [searchDocs],
  jsonSchema: { type: "string" },
  abortSignal: controller.signal,
});
```

## Next Steps

- [Core Functions](./core-functions.md) for think, infer, reason
- [Big Data & Streaming](./big-data.md) for batch processing
- [Error Handling](./error-handling.md) for AgentMaxTurnsError and ToolExecutionError
- [Agents & Tools (Language Guide)](/guide/agents) for the .tl syntax equivalent
