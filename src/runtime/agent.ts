import { getProvider } from "./provider.js";
import type {
  CompleteResult,
  Message,
  ToolCall,
  ToolResult,
  UsageInfo,
} from "./provider.js";
import type { Tool } from "./tools.js";
import { toolToDefinition } from "./tools.js";
import type { GuardRule } from "./guard.js";
import { evaluateGuards } from "./guard.js";
import { withRetry } from "./retry.js";
import { globalCostTracker } from "./cost-tracker.js";
import { AgentMaxTurnsError, ToolExecutionError } from "./errors.js";

export interface AgentOptions {
  prompt: string;
  tools: Tool[];
  context?: Record<string, unknown>;
  maxTurns?: number;
  model?: string;
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  guards?: GuardRule[];
  retryCount?: number;
  fallback?: () => unknown;
  onToolCall?: (call: ToolCall) => void;
  onToolResult?: (result: ToolResult & { toolName: string }) => void;
  abortSignal?: AbortSignal;
}

export interface AgentResult<T = unknown> {
  data: T;
  turns: number;
  totalUsage: UsageInfo;
  toolCallHistory: Array<{ call: ToolCall; result: ToolResult }>;
}

/**
 * Run an agentic loop: the LLM calls tools until it produces a final answer.
 *
 * @example
 * const result = await agent({
 *   prompt: "Find the weather in Tokyo",
 *   tools: [weatherTool],
 *   ...zodSchema(WeatherReport),
 *   maxTurns: 5,
 * });
 */
export async function agent<T = unknown>(options: AgentOptions): Promise<AgentResult<T>> {
  const {
    prompt,
    tools,
    context,
    maxTurns = 10,
    model,
    jsonSchema,
    schemaName,
    guards,
    retryCount,
    fallback,
    onToolCall,
    onToolResult,
    abortSignal,
  } = options;

  const execute = async (): Promise<AgentResult<T>> => {
    const provider = getProvider();
    const toolMap = new Map(tools.map(t => [t.name, t]));
    const toolDefs = tools.map(toolToDefinition);

    // Build system prompt
    let systemPrompt = "You are a helpful assistant with access to tools. Use the provided tools to accomplish the user's goal. When you have enough information to provide the final answer, respond directly without calling any more tools.";
    if (context && Object.keys(context).length > 0) {
      systemPrompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    // Build initial message
    const messages: Message[] = [
      { role: "user", content: prompt },
    ];

    const totalUsage: UsageInfo = { inputTokens: 0, outputTokens: 0 };
    const toolCallHistory: Array<{ call: ToolCall; result: ToolResult }> = [];
    let turns = 0;
    const startTime = Date.now();

    while (turns < maxTurns) {
      if (abortSignal?.aborted) {
        throw new Error("Agent aborted");
      }

      turns++;

      // On the last turn, if we have a JSON schema, ask for structured output
      const isLastChance = turns === maxTurns;

      const result: CompleteResult = await provider.complete({
        systemPrompt,
        userMessage: prompt,
        messages,
        tools: isLastChance ? undefined : toolDefs,
        jsonSchema: (isLastChance || !toolDefs.length) ? jsonSchema : undefined,
        schemaName,
        model,
      });

      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      // If the model made tool calls, execute them
      if (result.toolCalls && result.toolCalls.length > 0 && result.stopReason === "tool_use") {
        // Record assistant message with tool calls
        messages.push({
          role: "assistant",
          content: typeof result.data === "string" ? result.data : "",
          toolCalls: result.toolCalls,
        });

        // Execute each tool call
        const toolResults: ToolResult[] = [];
        for (const call of result.toolCalls) {
          if (onToolCall) onToolCall(call);

          const tool = toolMap.get(call.name);
          let output: unknown;
          let isError = false;

          if (!tool) {
            output = `Unknown tool: ${call.name}`;
            isError = true;
          } else {
            try {
              output = await tool.execute(call.input);
            } catch (err) {
              output = err instanceof Error ? err.message : String(err);
              isError = true;
            }
          }

          const toolResult: ToolResult = {
            toolCallId: call.id,
            output,
            isError,
          };
          toolResults.push(toolResult);
          toolCallHistory.push({ call, result: toolResult });

          if (onToolResult) {
            onToolResult({ ...toolResult, toolName: call.name });
          }
        }

        // Add tool results to messages
        messages.push({
          role: "tool_result",
          content: "",
          toolResults,
        });

        continue; // Loop for next turn
      }

      // Model returned a final answer (no tool calls)
      const durationMs = Date.now() - startTime;
      globalCostTracker.record({
        operation: "agent",
        model: result.model,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        prompt: prompt.slice(0, 100),
        durationMs,
      });

      const data = result.data as T;

      // Apply guards
      if (guards && guards.length > 0) {
        evaluateGuards(data, guards);
      }

      return { data, turns, totalUsage, toolCallHistory };
    }

    // Reached max turns
    const durationMs = Date.now() - startTime;
    globalCostTracker.record({
      operation: "agent",
      model: model ?? "unknown",
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
      prompt: prompt.slice(0, 100),
      durationMs,
    });

    throw new AgentMaxTurnsError(maxTurns, turns);
  };

  if (retryCount && retryCount > 0) {
    return withRetry(execute, {
      attempts: retryCount,
      fallback: fallback ? (() => ({
        data: fallback() as T,
        turns: 0,
        totalUsage: { inputTokens: 0, outputTokens: 0 },
        toolCallHistory: [],
      })) : undefined,
    });
  }

  return execute();
}
