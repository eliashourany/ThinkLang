import type { ToolDefinition } from "./provider.js";
import type { ZodType } from "zod";
import { zodSchema as zodSchemaFn } from "./zod-schema.js";

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface DefineToolConfig<TInput, TOutput> {
  name: string;
  description: string;
  input: ZodType<TInput> | Record<string, unknown>;
  execute: (input: TInput) => Promise<TOutput>;
}

/**
 * Define a tool that can be used by the agent runtime.
 *
 * Accepts either a Zod schema or raw JSON Schema for the input.
 *
 * @example
 * const searchDocs = defineTool({
 *   name: "searchDocs",
 *   description: "Search internal docs",
 *   input: z.object({ query: z.string() }),
 *   execute: async ({ query }) => await docsIndex.search(query),
 * });
 */
export function defineTool<TInput = unknown, TOutput = unknown>(
  config: DefineToolConfig<TInput, TOutput>
): Tool<TInput, TOutput> {
  let inputSchema: Record<string, unknown>;

  if (isZodType(config.input)) {
    // Convert Zod schema to JSON Schema
    const result = zodSchemaFn(config.input);
    inputSchema = result.jsonSchema;
  } else {
    inputSchema = config.input as Record<string, unknown>;
  }

  return {
    name: config.name,
    description: config.description,
    inputSchema,
    execute: config.execute,
  };
}

/**
 * Convert a Tool to the ToolDefinition format used by providers.
 */
export function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}

function isZodType(value: unknown): value is ZodType<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_def" in value &&
    "parse" in value
  );
}
