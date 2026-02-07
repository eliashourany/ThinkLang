import { compile } from "../compiler/index.js";
import * as runtime from "../runtime/index.js";

export class ReplEvaluator {
  private state: Record<string, unknown> = {};

  async evaluate(source: string): Promise<unknown> {
    const result = await compile(source, { replMode: true });

    if (result.errors.length > 0) {
      throw new Error(result.errors.join("\n"));
    }

    for (const warning of result.warnings) {
      console.warn(`[warning] ${warning}`);
    }

    // Replace the import with direct runtime reference
    let code = result.code;
    code = code.replace(
      /import \* as __tl_runtime from .*;\n?/,
      ""
    );

    // Execute in an async function with runtime and state available
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction(
      "__tl_runtime",
      "__tl_state",
      `
      with (__tl_state) {
        ${code}
      }
      `
    );

    const returnValue = await fn(runtime, this.state);
    return returnValue;
  }

  defineVariable(name: string, value: unknown): void {
    this.state[name] = value;
  }

  getState(): Record<string, unknown> {
    return { ...this.state };
  }

  clearState(): void {
    this.state = {};
  }
}
