import type {
  CompleteOptions,
  CompleteResult,
  ModelProvider,
  ToolCall,
  Message,
} from "../provider.js";
import { ModelUnavailable } from "../errors.js";

export class OllamaProvider implements ModelProvider {
  private defaultModel: string;
  private baseUrl: string;

  constructor(model?: string, baseUrl?: string) {
    this.defaultModel = model ?? process.env.THINKLANG_MODEL ?? "llama3";
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const model = options.model ?? this.defaultModel;
    const hasTools = options.tools && options.tools.length > 0;

    // Build messages (OpenAI-compatible format)
    const messages: any[] = [];
    if (options.systemPrompt) {
      let systemContent = options.systemPrompt;
      // Embed JSON schema in system prompt for structured output
      if (options.jsonSchema && !hasTools) {
        systemContent += `\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.jsonSchema, null, 2)}`;
      }
      messages.push({ role: "system", content: systemContent });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...this.convertMessages(options.messages));
    } else {
      messages.push({ role: "user", content: options.userMessage });
    }

    const body: any = {
      model,
      messages,
      stream: false,
      options: {
        num_predict: options.maxTokens ?? 4096,
      },
    };

    // Use JSON format for structured output
    if (options.jsonSchema && !hasTools) {
      body.format = "json";
    }

    // Add tools (Ollama supports OpenAI-compatible tool format)
    if (hasTools) {
      body.tools = options.tools!.map(t => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new ModelUnavailable(model);
        }
        const errorText = await response.text();
        throw new ModelUnavailable(`${model} — ${errorText}`);
      }

      const json: any = await response.json();

      const usage = {
        inputTokens: json.prompt_eval_count ?? 0,
        outputTokens: json.eval_count ?? 0,
      };

      // Extract tool calls
      const toolCalls: ToolCall[] = [];
      if (json.message?.tool_calls) {
        for (const tc of json.message.tool_calls) {
          toolCalls.push({
            id: `ollama-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: tc.function.name,
            input: tc.function.arguments ?? {},
          });
        }
      }

      // Parse data
      let data: unknown = null;
      if (json.message?.content) {
        try {
          data = JSON.parse(json.message.content);
        } catch {
          data = json.message.content;
        }
      }

      const stopReason = toolCalls.length > 0 ? "tool_use" as const
        : json.done_reason === "length" ? "max_tokens" as const
        : "end_turn" as const;

      return {
        data,
        usage,
        model,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        stopReason,
      };
    } catch (error: any) {
      if (error instanceof ModelUnavailable) throw error;
      if (error?.code === "ECONNREFUSED") {
        throw new ModelUnavailable(`Ollama not running at ${this.baseUrl}`);
      }
      throw error;
    }
  }

  private convertMessages(messages: Message[]): any[] {
    const result: any[] = [];
    for (const msg of messages) {
      if (msg.role === "tool_result" && msg.toolResults) {
        for (const tr of msg.toolResults) {
          result.push({
            role: "tool",
            content: typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output),
          });
        }
      } else if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.toolCalls.map(tc => ({
            function: { name: tc.name, arguments: tc.input },
          })),
        });
      } else {
        result.push({ role: msg.role === "tool_result" ? "user" : msg.role, content: msg.content });
      }
    }
    return result;
  }
}
