import type {
  CompleteOptions,
  CompleteResult,
  ModelProvider,
  ToolCall,
  Message,
} from "../provider.js";
import { ModelUnavailable } from "../errors.js";

let GoogleGenAI: any;

function loadGeminiSDK(): any {
  if (!GoogleGenAI) {
    try {
      const mod = require("@google/generative-ai");
      GoogleGenAI = mod.GoogleGenerativeAI ?? mod.default;
    } catch {
      throw new Error(
        'The "@google/generative-ai" package is required for the Gemini provider. Install it with: npm install @google/generative-ai'
      );
    }
  }
  return GoogleGenAI;
}

export class GeminiProvider implements ModelProvider {
  private client: any;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    const SDK = loadGeminiSDK();
    this.client = new SDK(apiKey ?? process.env.GEMINI_API_KEY);
    this.defaultModel = model ?? process.env.THINKLANG_MODEL ?? "gemini-2.0-flash";
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const modelName = options.model ?? this.defaultModel;

    try {
      const genConfig: any = {
        maxOutputTokens: options.maxTokens ?? 4096,
      };

      // Add JSON schema output
      if (options.jsonSchema) {
        genConfig.responseMimeType = "application/json";
        genConfig.responseSchema = options.jsonSchema;
      }

      const modelOptions: any = {
        model: modelName,
        generationConfig: genConfig,
      };

      if (options.systemPrompt) {
        modelOptions.systemInstruction = options.systemPrompt;
      }

      // Add tools
      if (options.tools && options.tools.length > 0) {
        modelOptions.tools = [{
          functionDeclarations: options.tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          })),
        }];
      }

      const genModel = this.client.getGenerativeModel(modelOptions);

      // Build contents
      const contents: any[] = [];
      if (options.messages && options.messages.length > 0) {
        contents.push(...this.convertMessages(options.messages));
      } else {
        contents.push({ role: "user", parts: [{ text: options.userMessage }] });
      }

      const result = await genModel.generateContent({ contents });
      const response = result.response;

      const usage = {
        inputTokens: response?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response?.usageMetadata?.candidatesTokenCount ?? 0,
      };

      // Extract tool calls
      const toolCalls: ToolCall[] = [];
      let data: unknown = null;

      const candidate = response?.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      for (const part of parts) {
        if (part.functionCall) {
          toolCalls.push({
            id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: part.functionCall.name,
            input: part.functionCall.args ?? {},
          });
        } else if (part.text) {
          try {
            data = JSON.parse(part.text);
          } catch {
            data = part.text;
          }
        }
      }

      const finishReason = candidate?.finishReason;
      const stopReason = finishReason === "STOP" ? "end_turn" as const
        : toolCalls.length > 0 ? "tool_use" as const
        : "end_turn" as const;

      return {
        data,
        usage,
        model: modelName,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        stopReason,
      };
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes("not found")) {
        throw new ModelUnavailable(modelName);
      }
      throw error;
    }
  }

  private convertMessages(messages: Message[]): any[] {
    const contents: any[] = [];
    for (const msg of messages) {
      if (msg.role === "tool_result" && msg.toolResults) {
        contents.push({
          role: "user",
          parts: msg.toolResults.map(tr => ({
            functionResponse: {
              name: tr.toolCallId,
              response: { result: tr.output },
            },
          })),
        });
      } else if (msg.role === "assistant") {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          contents.push({
            role: "model",
            parts: msg.toolCalls.map(tc => ({
              functionCall: { name: tc.name, args: tc.input },
            })),
          });
        } else {
          contents.push({ role: "model", parts: [{ text: msg.content }] });
        }
      } else {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      }
    }
    return contents;
  }
}
