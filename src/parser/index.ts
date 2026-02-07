import type { ProgramNode } from "../ast/nodes.js";

// The generated parser is created by scripts/build-parser.ts
// It may not exist yet — run `npm run build:parser` first
let parserModule: any = null;

async function loadParser() {
  if (!parserModule) {
    parserModule = await import("./generated-parser.js");
  }
  return parserModule as { parse: (input: string, options?: any) => ProgramNode };
}

export async function parse(source: string): Promise<ProgramNode> {
  const parser = await loadParser();
  return parser.parse(source);
}

export function parseSync(source: string): ProgramNode {
  if (!parserModule) {
    throw new Error("Parser not loaded. Call loadParser() first.");
  }
  return parserModule.parse(source);
}

export { loadParser };
