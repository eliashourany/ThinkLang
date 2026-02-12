import Anthropic from "@anthropic-ai/sdk";
import type {
  CompleteOptions,
  CompleteResult,
  ModelProvider,
  ToolCall,
  Message,
} from "./provider.js";
import { ModelUnavailable, SchemaViolation } from "./errors.js";

// Properties not supported by the Anthropic JSON schema API
const UNSUPPORTED_SCHEMA_PROPS = new Set([
  "maxItems", "minItems", "minimum", "maximum",
  "pattern", "minLength", "maxLength",
]);

interface SanitizeResult {
  schema: Record<string, unknown>;
  constraints: string[];
}

function sanitizeSchema(
  schema: Record<string, unknown>,
  path = ""
): SanitizeResult {
  const cleaned: Record<string, unknown> = {};
  const constraints: string[] = [];

  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_SCHEMA_PROPS.has(key)) {
      constraints.push(`${path || "value"}: ${key} = ${value}`);
      continue;
    }
    if (key === "properties" && typeof value === "object" && value !== null) {
      const props: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(value as Record<string, unknown>)) {
        if (typeof pv === "object" && pv !== null) {
          const sub = sanitizeSchema(pv as Record<string, unknown>, path ? `${path}.${pk}` : pk);
          props[pk] = sub.schema;
          constraints.push(...sub.constraints);
        } else {
          props[pk] = pv;
        }
      }
      cleaned[key] = props;
    } else if (key === "items" && typeof value === "object" && value !== null) {
      const sub = sanitizeSchema(value as Record<string, unknown>, `${path}[]`);
      cleaned[key] = sub.schema;
      constraints.push(...sub.constraints);
    } else if (key === "anyOf" && Array.isArray(value)) {
      cleaned[key] = value.map((v, i) => {
        if (typeof v === "object" && v !== null) {
          const sub = sanitizeSchema(v as Record<string, unknown>, path);
          constraints.push(...sub.constraints);
          return sub.schema;
        }
        return v;
      });
    } else {
      cleaned[key] = value;
    }
  }

  return { schema: cleaned, constraints };
}

export class AnthropicProvider implements ModelProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model ?? process.env.THINKLANG_MODEL ?? "claude-opus-4-6";
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const model = options.model ?? this.defaultModel;
    const hasTools = options.tools && options.tools.length > 0;

    let systemPrompt = options.systemPrompt;

    // Build messages array
    let messages: any[];
    if (options.messages && options.messages.length > 0) {
      messages = this.convertMessages(options.messages);
    } else {
      messages = [{ role: "user", content: options.userMessage }];
    }

    // Build request params
    const params: any = {
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt,
      messages,
    };

    // Add tools if present
    if (hasTools) {
      params.tools = options.tools!.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));

      if (options.toolChoice) {
        if (typeof options.toolChoice === "string") {
          params.tool_choice = { type: options.toolChoice };
        } else {
          params.tool_choice = { type: "tool", name: options.toolChoice.name };
        }
      }
    }

    // Add JSON schema output format when schema is provided and no tools
    if (options.jsonSchema && !hasTools) {
      const { schema, constraints } = sanitizeSchema(options.jsonSchema);
      if (constraints.length > 0) {
        const suffix = "\n\nAdditional constraints:\n" + constraints.map(c => `- ${c}`).join("\n");
        systemPrompt = systemPrompt ? systemPrompt + suffix : suffix.trimStart();
        params.system = systemPrompt;
      }
      params.output_config = {
        format: { type: "json_schema" as const, schema },
      };
    }

    if (options.stopSequences && options.stopSequences.length > 0) {
      params.stop_sequences = options.stopSequences;
    }

    try {
      const response = await this.client.messages.create(params);

      const usage = {
        inputTokens: (response as any).usage?.input_tokens ?? 0,
        outputTokens: (response as any).usage?.output_tokens ?? 0,
      };

      // Map stop reason
      const rawReason = (response as any).stop_reason;
      const stopReason = rawReason === "tool_use" ? "tool_use" as const
        : rawReason === "max_tokens" ? "max_tokens" as const
        : rawReason === "stop_sequence" ? "stop_sequence" as const
        : "end_turn" as const;

      // Extract tool calls from response
      const toolCalls: ToolCall[] = [];
      let data: unknown = null;

      for (const block of response.content) {
        if ((block as any).type === "tool_use") {
          toolCalls.push({
            id: (block as any).id,
            name: (block as any).name,
            input: (block as any).input as Record<string, unknown>,
          });
        } else if ((block as any).type === "json") {
          data = (block as any).json;
        } else if ((block as any).type === "text") {
          const text = (block as any).text;
          if (data === null) {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }
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
      if (error instanceof SchemaViolation) throw error;
      if (error?.status === 404) {
        throw new ModelUnavailable(model);
      }
      if (error?.status === 400) {
        const detail = error?.error?.error?.message ?? error?.message ?? "Bad request";
        throw new ModelUnavailable(`${model} — ${detail}`);
      }
      throw error;
    }
  }

  private convertMessages(messages: Message[]): any[] {
    const result: any[] = [];
    for (const msg of messages) {
      if (msg.role === "tool_result" && msg.toolResults) {
        result.push({
          role: "user",
          content: msg.toolResults.map(tr => ({
            type: "tool_result",
            tool_use_id: tr.toolCallId,
            content: typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output),
            is_error: tr.isError ?? false,
          })),
        });
      } else if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: msg.toolCalls.map(tc => ({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          })),
        });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }
    return result;
  }
}
