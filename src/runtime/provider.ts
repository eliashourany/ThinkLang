// ─── Tool Calling Types ──────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: unknown;
  isError?: boolean;
}

export interface Message {
  role: "user" | "assistant" | "tool_result";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// ─── Complete Options / Result ───────────────────────────

export interface CompleteOptions {
  systemPrompt: string;
  userMessage: string;
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  model?: string;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "required" | "none" | { name: string };
  messages?: Message[];
  stopSequences?: string[];
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface CompleteResult {
  data: unknown;
  usage: UsageInfo;
  model: string;
  toolCalls?: ToolCall[];
  stopReason?: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
}

// ─── Provider Interface ──────────────────────────────────

export interface ModelProvider {
  complete(options: CompleteOptions): Promise<CompleteResult>;
}

// ─── Provider Singleton ──────────────────────────────────

import { createProvider } from "./provider-registry.js";

let currentProvider: ModelProvider | null = null;

export function setProvider(provider: ModelProvider): void {
  currentProvider = provider;
}

export function getProvider(): ModelProvider {
  if (!currentProvider) {
    // Auto-init from environment — try to detect available provider
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (anthropicKey || openaiKey || geminiKey) {
      if (anthropicKey) {
        currentProvider = createProvider("anthropic", { apiKey: anthropicKey });
      } else if (openaiKey) {
        currentProvider = createProvider("openai", { apiKey: openaiKey });
      } else if (geminiKey) {
        currentProvider = createProvider("gemini", { apiKey: geminiKey });
      }
      return currentProvider!;
    }

    throw new Error(
      "No ModelProvider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in environment, or call init()."
    );
  }
  return currentProvider;
}
