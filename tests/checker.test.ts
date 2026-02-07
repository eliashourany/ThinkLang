import { describe, it, expect, beforeAll } from "vitest";
import { check } from "../src/checker/checker.js";
import type { TypeDeclMap } from "../src/compiler/type-compiler.js";

let parse: (source: string) => any;

beforeAll(async () => {
  const mod = await import("../src/parser/generated-parser.js");
  parse = mod.parse;
});

function collectTypeDecls(ast: any): TypeDeclMap {
  const decls: TypeDeclMap = new Map();
  for (const stmt of ast.body) {
    if (stmt.type === "TypeDeclaration") {
      decls.set(stmt.name, stmt);
    }
  }
  return decls;
}

function checkSource(source: string) {
  const ast = parse(source);
  const typeDecls = collectTypeDecls(ast);
  return check(ast, typeDecls);
}

describe("Type Checker", () => {
  describe("basic type checking", () => {
    it("passes for simple let declarations", () => {
      const result = checkSource('let x = "hello"');
      expect(result.errors).toHaveLength(0);
    });

    it("passes for function declarations", () => {
      const result = checkSource('fn greet(name: string) {\n  print name\n}');
      expect(result.errors).toHaveLength(0);
    });

    it("passes for type declarations", () => {
      const result = checkSource("type Foo {\n  name: string\n}");
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("uncertain type checking", () => {
    it("flags uncertain access without unwrap", () => {
      const result = checkSource(
        'let uncertain x = think<string>("test")\nlet y = x.length'
      );
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("uncertain");
    });

    it("allows .unwrap() on uncertain values", () => {
      const result = checkSource(
        'let uncertain x = think<string>("test")\nlet y = x.unwrap()'
      );
      expect(result.errors).toHaveLength(0);
    });

    it("allows .expect() on uncertain values", () => {
      const result = checkSource(
        'let uncertain x = think<string>("test")\nlet y = x.expect(0.8)'
      );
      expect(result.errors).toHaveLength(0);
    });

    it("allows .or() on uncertain values", () => {
      const result = checkSource(
        'let uncertain x = think<string>("test")\nlet y = x.or("fallback")'
      );
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("match exhaustiveness", () => {
    it("warns when match is non-exhaustive", () => {
      const result = checkSource(
        'let x = 1\nlet y = match x {\n  { value: >= 1 } => "high"\n}'
      );
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain("exhaustive");
    });

    it("does not warn when match has wildcard", () => {
      const result = checkSource(
        'let x = 1\nlet y = match x {\n  { value: >= 1 } => "high"\n  _ => "low"\n}'
      );
      const matchWarnings = result.warnings.filter(w => w.message.includes("exhaustive"));
      expect(matchWarnings).toHaveLength(0);
    });
  });

  describe("try/catch checking", () => {
    it("passes for valid try/catch", () => {
      const result = checkSource(
        'try {\n  let x = 1\n} catch SchemaViolation (e) {\n  print "error"\n}'
      );
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("if/else checking", () => {
    it("passes for valid if/else", () => {
      const result = checkSource(
        'if true {\n  print "yes"\n} else {\n  print "no"\n}'
      );
      expect(result.errors).toHaveLength(0);
    });
  });
});
