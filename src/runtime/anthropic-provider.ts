import Anthropic from "@anthropic-ai/sdk";
import type { CompleteOptions, CompleteResult, ModelProvider } from "./provider.js";
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
    const { schema, constraints } = sanitizeSchema(options.jsonSchema);

    let systemPrompt = options.systemPrompt;
    if (constraints.length > 0) {
      const suffix = "\n\nAdditional constraints:\n" + constraints.map(c => `- ${c}`).join("\n");
      systemPrompt = systemPrompt ? systemPrompt + suffix : suffix.trimStart();
    }

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: options.userMessage },
        ],
        output_config: {
          format: {
            type: "json_schema" as const,
            schema,
          },
        },
      } as any);

      const usage = {
        inputTokens: (response as any).usage?.input_tokens ?? 0,
        outputTokens: (response as any).usage?.output_tokens ?? 0,
      };

      const block = response.content[0] as any;
      if (block && block.type === "json") {
        return { data: block.json, usage, model };
      }

      // Fallback: try parsing text content
      if (block && block.type === "text") {
        try {
          return { data: JSON.parse((block as any).text), usage, model };
        } catch {
          throw new SchemaViolation("valid JSON", (block as any).text);
        }
      }

      throw new SchemaViolation("json response", block);
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
}
