import { describe, it, expect, beforeAll } from "vitest";
import { compile } from "../src/compiler/index.js";

describe("ThinkLang Compiler", () => {
  describe("basic compilation", () => {
    it("compiles let declaration with string", async () => {
      const result = await compile('let x = "hello"');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('const x = "hello"');
    });

    it("compiles print statement", async () => {
      const result = await compile('print "hello"');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("console.log");
    });

    it("compiles number literal", async () => {
      const result = await compile("let x = 42");
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("const x = 42");
    });

    it("wraps non-declaration statements in async main", async () => {
      const result = await compile('let x = "hello"\nprint x');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("async function __tl_main()");
      expect(result.code).toContain("__tl_main().catch(console.error)");
    });
  });

  describe("type declarations", () => {
    it("emits comment for type declarations", async () => {
      const result = await compile("type Foo {\n  name: string\n  age: int\n}");
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("// type Foo { name: string; age: number }");
    });
  });

  describe("function declarations", () => {
    it("emits async function", async () => {
      const result = await compile('fn greet(name: string) {\n  print name\n}');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("async function greet(name)");
    });
  });

  describe("think expression compilation", () => {
    it("compiles think<string> to runtime call", async () => {
      const result = await compile('let x = think<string>("Hello")');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("__tl_runtime.think(");
      expect(result.code).toContain('"type":"string"');
      expect(result.code).toContain('"Hello"');
    });

    it("compiles think with named type to runtime call with object schema", async () => {
      const result = await compile(
        'type Foo {\n  name: string\n}\nlet x = think<Foo>("test")'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("__tl_runtime.think(");
      expect(result.code).toContain('"type":"object"');
    });

    it("compiles think with context", async () => {
      const result = await compile(
        'let data = "test"\nlet x = think<string>("Hello")\n  with context: data'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("context:");
    });

    it("compiles think with Confident type", async () => {
      const result = await compile('let x = think<Confident<string>>("test")');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('"confidence"');
      expect(result.code).toContain('"reasoning"');
    });
  });

  describe("infer expression compilation", () => {
    it("compiles infer to runtime call", async () => {
      const result = await compile('let x = infer<string>("hello", "detect language")');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("__tl_runtime.infer(");
    });
  });

  describe("Phase 2: try/catch compilation", () => {
    it("compiles try/catch to TypeScript try/catch", async () => {
      const result = await compile(
        'try {\n  let x = 1\n} catch SchemaViolation (e) {\n  print "error"\n}'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("try {");
      expect(result.code).toContain("catch");
      expect(result.code).toContain("__tl_runtime.SchemaViolation");
    });
  });

  describe("Phase 2: if/else compilation", () => {
    it("compiles if/else to TypeScript", async () => {
      const result = await compile('if true {\n  print "yes"\n} else {\n  print "no"\n}');
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("if (true)");
      expect(result.code).toContain("} else {");
    });
  });

  describe("Phase 2: match expression compilation", () => {
    it("compiles match to conditional chain", async () => {
      const result = await compile(
        'let result = 1\nlet x = match result {\n  { confidence: >= 0.9 } => "high"\n  _ => "low"\n}'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain(".confidence >= 0.9");
    });
  });

  describe("Phase 2: reason block compilation", () => {
    it("compiles reason block to runtime call", async () => {
      const result = await compile(
        'let x = reason<string> {\n  goal: "Analyze"\n  steps:\n    1. "Step one"\n    2. "Step two"\n}'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("__tl_runtime.reason(");
      expect(result.code).toContain("Analyze");
    });
  });

  describe("Phase 2: guard compilation", () => {
    it("compiles guard clause to guards option", async () => {
      const result = await compile(
        'let x = think<string>("test")\n  guard {\n    length: 10..500\n  }'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("guards:");
      expect(result.code).toContain('"length"');
    });

    it("compiles on_fail to retry option", async () => {
      const result = await compile(
        'let x = think<string>("test")\n  guard {\n    length: 10..500\n  }\n  on_fail: retry(3)'
      );
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("retryCount: 3");
    });
  });

  describe("Phase 2: operators", () => {
    it("compiles binary expressions", async () => {
      const result = await compile("let x = 1 + 2");
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("(1 + 2)");
    });

    it("compiles comparison expressions", async () => {
      const result = await compile("let x = a >= 5");
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain("(a >= 5)");
    });
  });

  describe("REPL mode", () => {
    it("compiles in REPL mode without async main wrapper", async () => {
      const result = await compile('let x = "hello"', { replMode: true });
      expect(result.errors).toHaveLength(0);
      expect(result.code).not.toContain("__tl_main");
    });
  });
});
