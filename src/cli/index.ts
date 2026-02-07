#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { compile } from "../compiler/index.js";
import { startRepl } from "../repl/index.js";
import { AnthropicProvider } from "../runtime/anthropic-provider.js";
import { setProvider } from "../runtime/provider.js";
import { globalCostTracker } from "../runtime/cost-tracker.js";
import * as runtime from "../runtime/index.js";

// Load .env
dotenv.config();

function initProvider(): void {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    setProvider(new AnthropicProvider(apiKey));
  }
}

function printCostSummary(): void {
  const summary = globalCostTracker.getSummary();
  if (summary.totalCalls === 0) {
    console.log("\nNo AI calls were made.");
    return;
  }

  console.log("\n--- Cost Summary ---");
  console.log(`Total calls: ${summary.totalCalls}`);
  console.log(`Total tokens: ${summary.totalInputTokens} input, ${summary.totalOutputTokens} output`);
  console.log(`Total cost: $${summary.totalCostUsd.toFixed(6)}`);

  if (summary.byOperation.size > 0) {
    console.log("\nBy operation:");
    for (const [op, data] of summary.byOperation) {
      console.log(`  ${op}: ${data.calls} calls, ${data.inputTokens + data.outputTokens} tokens, $${data.costUsd.toFixed(6)}`);
    }
  }

  if (summary.byModel.size > 0) {
    console.log("\nBy model:");
    for (const [model, data] of summary.byModel) {
      console.log(`  ${model}: ${data.calls} calls, $${data.costUsd.toFixed(6)}`);
    }
  }
}

const program = new Command();

program
  .name("thinklang")
  .description("ThinkLang — an AI-native programming language")
  .version("0.1.0");

program
  .command("run <file>")
  .description("Run a ThinkLang (.tl) program")
  .option("--show-cost", "Show cost summary after execution")
  .action(async (file: string, opts: { showCost?: boolean }) => {
    initProvider();

    const filePath = resolve(file);
    const source = readFileSync(filePath, "utf-8");

    const result = await compile(source, { filePath });

    if (result.errors.length > 0) {
      console.error("Compilation errors:");
      for (const err of result.errors) {
        console.error(`  ${err}`);
      }
      process.exit(1);
    }

    for (const warning of result.warnings) {
      console.warn(`[warning] ${warning}`);
    }

    // Execute the compiled TypeScript
    const code = result.code.replace(
      /import \* as __tl_runtime from .*;\n?/,
      ""
    );

    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction("__tl_runtime", code);
    await fn(runtime);

    if (opts.showCost) {
      printCostSummary();
    }
  });

program
  .command("compile <file>")
  .description("Compile a ThinkLang (.tl) program to TypeScript")
  .option("-o, --output <file>", "Output file path")
  .action(async (file: string, opts: { output?: string }) => {
    const filePath = resolve(file);
    const source = readFileSync(filePath, "utf-8");

    const result = await compile(source, { filePath });

    if (result.errors.length > 0) {
      console.error("Compilation errors:");
      for (const err of result.errors) {
        console.error(`  ${err}`);
      }
      process.exit(1);
    }

    for (const warning of result.warnings) {
      console.warn(`[warning] ${warning}`);
    }

    if (opts.output) {
      const { writeFileSync } = await import("fs");
      writeFileSync(resolve(opts.output), result.code, "utf-8");
      console.log(`Compiled to ${opts.output}`);
    } else {
      console.log(result.code);
    }
  });

program
  .command("repl")
  .description("Start the ThinkLang REPL")
  .action(async () => {
    initProvider();
    await startRepl();
  });

program
  .command("test [target]")
  .description("Run ThinkLang tests (.test.tl files)")
  .option("--update-snapshots", "Record live responses to snapshot files")
  .option("--replay", "Use snapshot files for deterministic replay")
  .option("--pattern <regex>", "Filter test files by pattern")
  .action(async (target: string | undefined, opts: { updateSnapshots?: boolean; replay?: boolean; pattern?: string }) => {
    initProvider();

    const { runTests } = await import("../testing/runner.js");
    const results = await runTests(target ?? ".", opts);

    const failed = results.reduce((sum, s) => sum + s.totalFailed, 0);
    if (failed > 0) {
      process.exit(1);
    }
  });

program
  .command("cost-report")
  .description("Show cost report for the current session")
  .action(() => {
    printCostSummary();
  });

program.parse();
