import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join, relative } from "path";
import { parse } from "../parser/index.js";
import type * as AST from "../ast/nodes.js";
import type { TestSuiteResult } from "./types.js";
import { executeTestBlock } from "./executor.js";
import { loadSnapshot } from "./snapshot.js";
import { ReplayProvider } from "./replay-provider.js";
import { setProvider } from "../runtime/provider.js";
import { formatSuiteResult, formatSummary } from "./reporter.js";

export interface RunnerOptions {
  updateSnapshots?: boolean;
  replay?: boolean;
  pattern?: string;
}

export async function runTests(
  target: string,
  options: RunnerOptions = {}
): Promise<TestSuiteResult[]> {
  const files = discoverTestFiles(target, options.pattern);
  const suites: TestSuiteResult[] = [];

  for (const file of files) {
    const suite = await runTestFile(file, options);
    suites.push(suite);
    console.log(formatSuiteResult(suite));
  }

  console.log(formatSummary(suites));

  return suites;
}

function discoverTestFiles(target: string, pattern?: string): string[] {
  const fullPath = resolve(target);
  const files: string[] = [];

  try {
    const stat = statSync(fullPath);
    if (stat.isFile() && fullPath.endsWith(".test.tl")) {
      files.push(fullPath);
    } else if (stat.isDirectory()) {
      walkDir(fullPath, files);
    }
  } catch {
    // Target not found
  }

  if (pattern) {
    const regex = new RegExp(pattern);
    return files.filter(f => regex.test(f));
  }

  return files;
}

function walkDir(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && entry !== "node_modules") {
      walkDir(fullPath, files);
    } else if (entry.endsWith(".test.tl")) {
      files.push(fullPath);
    }
  }
}

async function runTestFile(
  filePath: string,
  options: RunnerOptions
): Promise<TestSuiteResult> {
  const source = readFileSync(filePath, "utf-8");
  const ast = await parse(source);
  const startTime = Date.now();

  // Separate test blocks from preamble (types, functions, lets)
  const preamble: AST.StatementNode[] = [];
  const testBlocks: AST.TestBlockNode[] = [];

  for (const stmt of ast.body) {
    if (stmt.type === "TestBlock") {
      testBlocks.push(stmt);
    } else {
      preamble.push(stmt);
    }
  }

  const results = [];
  let totalCost = 0;

  for (const testBlock of testBlocks) {
    // Set up replay provider if test has replay mode
    if (testBlock.mode?.modeName === "replay" && testBlock.mode.argument) {
      const snapshot = loadSnapshot(resolve(testBlock.mode.argument));
      if (snapshot) {
        setProvider(new ReplayProvider(snapshot));
      }
    }

    const result = await executeTestBlock(testBlock, preamble);
    results.push(result);
    totalCost += result.costUsd ?? 0;
  }

  return {
    file: relative(process.cwd(), filePath),
    tests: results,
    totalPassed: results.filter(r => r.passed).length,
    totalFailed: results.filter(r => !r.passed).length,
    totalDurationMs: Date.now() - startTime,
    totalCostUsd: totalCost,
  };
}
