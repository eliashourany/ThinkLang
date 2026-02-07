import Anthropic from "@anthropic-ai/sdk";
import type { CompleteOptions, CompleteResult, ModelProvider } from "./provider.js";
import { ModelUnavailable, SchemaViolation } from "./errors.js";

export class AnthropicProvider implements ModelProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model ?? process.env.THINKLANG_MODEL ?? "claude-opus-4-6";
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const model = options.model ?? this.defaultModel;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: options.systemPrompt,
        messages: [
          { role: "user", content: options.userMessage },
        ],
        output_config: {
          format: {
            type: "json_schema" as const,
            json_schema: {
              name: options.schemaName ?? "result",
              schema: options.jsonSchema,
            },
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
      if (error?.status === 404 || error?.status === 400) {
        throw new ModelUnavailable(model);
      }
      throw error;
    }
  }
}
