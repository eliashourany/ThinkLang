import { describe, it, expect } from "vitest";
import { parse } from "../src/parser/index.js";
import { compile } from "../src/compiler/index.js";

describe("Big Data Grammar", () => {
  describe("batch expression", () => {
    it("parses basic batch expression", async () => {
      const ast = await parse(`let results = batch<string>(items, processor)`);
      expect(ast.body[0].type).toBe("LetDeclaration");
      const expr = (ast.body[0] as any).value;
      expect(expr.type).toBe("BatchExpression");
      expect(expr.typeArgument.type).toBe("PrimitiveType");
      expect(expr.typeArgument.name).toBe("string");
    });

    it("parses batch with concurrency clause", async () => {
      const ast = await parse(`let results = batch<string>(items, handler) concurrency: 5`);
      const expr = (ast.body[0] as any).value;
      expect(expr.type).toBe("BatchExpression");
      expect(expr.concurrency).toBe(5);
    });

    it("parses batch with cost_budget clause", async () => {
      const ast = await parse(`let results = batch<string>(items, handler) cost_budget: 1.5`);
      const expr = (ast.body[0] as any).value;
      expect(expr.costBudget).toBe(1.5);
    });

    it("parses batch with on_error clause", async () => {
      const ast = await parse(`let results = batch<string>(items, handler) on_error: fail_fast`);
      const expr = (ast.body[0] as any).value;
      expect(expr.onError).toBe("fail-fast");
    });

    it("parses batch with all clauses", async () => {
      const ast = await parse(`let results = batch<string>(items, handler) concurrency: 3 cost_budget: 2.0 on_error: continue`);
      const expr = (ast.body[0] as any).value;
      expect(expr.concurrency).toBe(3);
      expect(expr.costBudget).toBe(2.0);
      expect(expr.onError).toBe("continue");
    });
  });

  describe("map_think expression", () => {
    it("parses basic map_think", async () => {
      const ast = await parse(`let sentiments = map_think<string>(reviews, classifier)`);
      const expr = (ast.body[0] as any).value;
      expect(expr.type).toBe("MapThinkExpression");
    });

    it("parses map_think with concurrency", async () => {
      const ast = await parse(`let results = map_think<string>(items, handler) concurrency: 10`);
      const expr = (ast.body[0] as any).value;
      expect(expr.concurrency).toBe(10);
    });

    it("parses map_think with context", async () => {
      const ast = await parse(`let results = map_think<string>(items, handler) with context: { data }`);
      const expr = (ast.body[0] as any).value;
      expect(expr.withContext).not.toBeNull();
    });
  });

  describe("reduce_think expression", () => {
    it("parses basic reduce_think", async () => {
      const ast = await parse(`let summary = reduce_think<string>(paragraphs, "Summarize")`);
      const expr = (ast.body[0] as any).value;
      expect(expr.type).toBe("ReduceThinkExpression");
    });

    it("parses reduce_think with batch_size", async () => {
      const ast = await parse(`let summary = reduce_think<string>(items, "Combine") batch_size: 5`);
      const expr = (ast.body[0] as any).value;
      expect(expr.batchSize).toBe(5);
    });

    it("parses reduce_think with context", async () => {
      const ast = await parse(`let summary = reduce_think<string>(items, "Combine") with context: { config }`);
      const expr = (ast.body[0] as any).value;
      expect(expr.withContext).not.toBeNull();
    });
  });

  describe("code generation", () => {
    it("compiles batch expression to runtime call", async () => {
      const result = await compile(`let results = batch<string>(items, processor)`);
      expect(result.code).toContain("__tl_runtime.batch(");
      expect(result.errors).toEqual([]);
    });

    it("compiles map_think expression to runtime call", async () => {
      const result = await compile(`let results = map_think<string>(items, template)`);
      expect(result.code).toContain("__tl_runtime.mapThink(");
      expect(result.errors).toEqual([]);
    });

    it("compiles reduce_think expression to runtime call", async () => {
      const result = await compile(`let summary = reduce_think<string>(items, "Summarize")`);
      expect(result.code).toContain("__tl_runtime.reduceThink(");
      expect(result.errors).toEqual([]);
    });

    it("compiles batch with concurrency option", async () => {
      const result = await compile(`let results = batch<string>(items, handler) concurrency: 3`);
      expect(result.code).toContain("maxConcurrency: 3");
    });

    it("compiles map_think with cost_budget", async () => {
      const result = await compile(`let results = map_think<string>(items, handler) cost_budget: 1.5`);
      expect(result.code).toContain("costBudget: 1.5");
    });

    it("compiles reduce_think with batch_size", async () => {
      const result = await compile(`let summary = reduce_think<string>(items, "Sum") batch_size: 5`);
      expect(result.code).toContain("batchSize: 5");
    });
  });
});
