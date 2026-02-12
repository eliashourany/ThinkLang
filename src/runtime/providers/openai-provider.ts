import type {
  CompleteOptions,
  CompleteResult,
  ModelProvider,
  ToolCall,
  Message,
} from "../provider.js";
import { ModelUnavailable, SchemaViolation } from "../errors.js";

let OpenAI: any;

function loadOpenAI(): any {
  if (!OpenAI) {
    try {
      OpenAI = require("openai").default ?? require("openai");
    } catch {
      throw new Error(
        'The "openai" package is required for the OpenAI provider. Install it with: npm install openai'
      );
    }
  }
  return OpenAI;
}

export class OpenAIProvider implements ModelProvider {
  private client: any;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    const SDK = loadOpenAI();
    this.client = new SDK({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
    this.defaultModel = model ?? process.env.THINKLANG_MODEL ?? "gpt-4o";
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const model = options.model ?? this.defaultModel;
    const hasTools = options.tools && options.tools.length > 0;

    // Build messages
    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...this.convertMessages(options.messages));
    } else {
      messages.push({ role: "user", content: options.userMessage });
    }

    // Build request params
    const params: any = {
      model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
    };

    // Add tools
    if (hasTools) {
      params.tools = options.tools!.map(t => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));

      if (options.toolChoice) {
        if (typeof options.toolChoice === "string") {
          params.tool_choice = options.toolChoice;
        } else {
          params.tool_choice = { type: "function", function: { name: options.toolChoice.name } };
        }
      }
    }

    // Add JSON schema response format
    if (options.jsonSchema && !hasTools) {
      params.response_format = {
        type: "json_schema",
        json_schema: {
          name: options.schemaName ?? "response",
          schema: options.jsonSchema,
          strict: true,
        },
      };
    }

    if (options.stopSequences && options.stopSequences.length > 0) {
      params.stop = options.stopSequences;
    }

    try {
      const response = await this.client.chat.completions.create(params);
      const choice = response.choices?.[0];

      const usage = {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      };

      // Map finish reason
      const rawReason = choice?.finish_reason;
      const stopReason = rawReason === "tool_calls" ? "tool_use" as const
        : rawReason === "length" ? "max_tokens" as const
        : rawReason === "stop" ? "end_turn" as const
        : "end_turn" as const;

      // Extract tool calls
      const toolCalls: ToolCall[] = [];
      if (choice?.message?.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          });
        }
      }

      // Parse data
      let data: unknown = null;
      if (choice?.message?.content) {
        try {
          data = JSON.parse(choice.message.content);
        } catch {
          data = choice.message.content;
        }
      }

      return {
        data,
        usage,
        model,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        stopReason,
      };
    } catch (error: any) {
      if (error?.status === 404) {
        throw new ModelUnavailable(model);
      }
      if (error?.status === 400) {
        throw new ModelUnavailable(`${model} — ${error?.message ?? "Bad request"}`);
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
            tool_call_id: tr.toolCallId,
            content: typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output),
          });
        }
      } else if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
          })),
        });
      } else {
        result.push({ role: msg.role === "tool_result" ? "user" : msg.role, content: msg.content });
      }
    }
    return result;
  }
}
