import { describe, it, expect, beforeAll } from "vitest";
import { compile } from "../src/compiler/index.js";

let parse: (source: string) => any;

beforeAll(async () => {
  const mod = await import("../src/parser/generated-parser.js");
  parse = mod.parse;
});

describe("Match Expressions", () => {
  describe("parsing", () => {
    it("parses match with object pattern and comparison", () => {
      const ast = parse('let x = match result {\n  { score: >= 90 } => "A"\n  _ => "F"\n}');
      expect(ast.body[0].value.type).toBe("MatchExpression");
      const arms = ast.body[0].value.arms;
      expect(arms).toHaveLength(2);
      expect(arms[0].pattern.type).toBe("ObjectPattern");
      expect(arms[0].pattern.fields[0].name).toBe("score");
      expect(arms[0].pattern.fields[0].constraint.type).toBe("ComparisonConstraint");
      expect(arms[0].pattern.fields[0].constraint.operator).toBe(">=");
      expect(arms[1].pattern.type).toBe("WildcardPattern");
    });

    it("parses match with multiple object pattern fields", () => {
      const ast = parse('let x = match result {\n  { confidence: >= 0.9, label: == "positive" } => "sure"\n  _ => "unsure"\n}');
      const fields = ast.body[0].value.arms[0].pattern.fields;
      expect(fields).toHaveLength(2);
      expect(fields[0].name).toBe("confidence");
      expect(fields[1].name).toBe("label");
    });

    it("parses match with literal patterns", () => {
      const ast = parse('let x = match val {\n  "hello" => 1\n  "world" => 2\n  _ => 0\n}');
      expect(ast.body[0].value.arms[0].pattern.type).toBe("LiteralPattern");
      expect(ast.body[0].value.arms[0].pattern.value.value).toBe("hello");
    });
  });

  describe("compilation", () => {
    it("compiles match to conditional chain", async () => {
      const source = `let result = 42
let grade = match result {
  { value: >= 90 } => "A"
  { value: >= 80 } => "B"
  _ => "C"
}
print grade`;
      const compiled = await compile(source);
      expect(compiled.errors).toHaveLength(0);
      expect(compiled.code).toContain(">= 90");
      expect(compiled.code).toContain(">= 80");
    });

    it("compiles wildcard as else branch", async () => {
      const source = `let x = 1
let y = match x {
  { val: == 1 } => "one"
  _ => "other"
}
print y`;
      const compiled = await compile(source);
      expect(compiled.errors).toHaveLength(0);
    });
  });

  describe("type checking", () => {
    it("warns about non-exhaustive match", async () => {
      const source = `let x = 1
let y = match x {
  { val: >= 1 } => "positive"
}`;
      const compiled = await compile(source);
      expect(compiled.warnings.some(w => w.includes("exhaustive"))).toBe(true);
    });

    it("no warning when wildcard present", async () => {
      const source = `let x = 1
let y = match x {
  { val: >= 1 } => "positive"
  _ => "other"
}`;
      const compiled = await compile(source);
      const exhaustiveWarnings = compiled.warnings.filter(w => w.includes("exhaustive"));
      expect(exhaustiveWarnings).toHaveLength(0);
    });
  });
});
