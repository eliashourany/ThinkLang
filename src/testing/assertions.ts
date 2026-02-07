import { think } from "../runtime/think.js";

export function assertValue(value: unknown, sourceText: string): void {
  if (!value) {
    throw new Error(`Assertion failed: ${sourceText}`);
  }
}

export interface SemanticAssertResult {
  passes: boolean;
  explanation: string;
}

export async function assertSemantic(
  subject: unknown,
  criteria: string
): Promise<SemanticAssertResult> {
  const result = (await think({
    jsonSchema: {
      type: "object",
      properties: {
        passes: { type: "boolean" },
        explanation: { type: "string" },
      },
      required: ["passes", "explanation"],
      additionalProperties: false,
    },
    prompt: `Does this value satisfy the criteria? Value: ${JSON.stringify(subject)} Criteria: ${criteria}`,
    schemaName: "semantic_assert",
  })) as SemanticAssertResult;

  return result;
}
