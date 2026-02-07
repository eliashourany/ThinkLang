import type * as AST from "../ast/nodes.js";
import type { TestResult } from "./types.js";
import { compile } from "../compiler/index.js";
import * as runtime from "../runtime/index.js";
import { globalCostTracker } from "../runtime/cost-tracker.js";

export async function executeTestBlock(
  testNode: AST.TestBlockNode,
  preamble: AST.StatementNode[]
): Promise<TestResult> {
  const startTime = Date.now();
  const startCost = globalCostTracker.getSummary().totalCostUsd;

  // Build source that includes preamble + test body
  // We compile the test body as statements in a program
  const program: AST.ProgramNode = {
    type: "Program",
    imports: [],
    body: [...preamble, ...testNode.body],
  };

  try {
    // Use the code generator directly on the combined program
    const { generate } = await import("../compiler/code-generator.js");

    // Collect type declarations from preamble
    const typeDecls = new Map<string, AST.TypeDeclarationNode>();
    for (const stmt of preamble) {
      if (stmt.type === "TypeDeclaration") {
        typeDecls.set(stmt.name, stmt);
      }
    }

    const code = generate(program, typeDecls, {});

    // Strip import and execute
    const execCode = code.replace(
      /import \* as __tl_runtime from .*;\n?/,
      ""
    );

    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction("__tl_runtime", execCode);
    await fn(runtime);

    const durationMs = Date.now() - startTime;
    const endCost = globalCostTracker.getSummary().totalCostUsd;

    return {
      description: testNode.description,
      passed: true,
      durationMs,
      costUsd: endCost - startCost,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const endCost = globalCostTracker.getSummary().totalCostUsd;

    return {
      description: testNode.description,
      passed: false,
      error: error.message,
      durationMs,
      costUsd: endCost - startCost,
    };
  }
}
