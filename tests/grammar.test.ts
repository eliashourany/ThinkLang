import { describe, it, expect, beforeAll } from "vitest";

let parse: (source: string) => any;

beforeAll(async () => {
  const mod = await import("../src/parser/generated-parser.js");
  parse = mod.parse;
});

describe("ThinkLang Parser", () => {
  describe("import declarations", () => {
    it("parses import statement", () => {
      const ast = parse('import { Foo } from "./types.tl"\nlet x = 1');
      expect(ast.imports).toHaveLength(1);
      expect(ast.imports[0].type).toBe("ImportDeclaration");
      expect(ast.imports[0].names).toEqual(["Foo"]);
      expect(ast.imports[0].path).toBe("./types.tl");
    });

    it("parses multiple imported names", () => {
      const ast = parse('import { Foo, Bar } from "./types.tl"\nlet x = 1');
      expect(ast.imports[0].names).toEqual(["Foo", "Bar"]);
    });

    it("program without imports has empty imports array", () => {
      const ast = parse("let x = 1");
      expect(ast.imports).toEqual([]);
    });
  });

  describe("basic statements", () => {
    it("parses let declarations", () => {
      const ast = parse('let x = "hello"');
      expect(ast.type).toBe("Program");
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe("LetDeclaration");
      expect(ast.body[0].name).toBe("x");
      expect(ast.body[0].value.type).toBe("StringLiteral");
      expect(ast.body[0].value.value).toBe("hello");
    });

    it("parses print statements", () => {
      const ast = parse('print "hello"');
      expect(ast.body[0].type).toBe("PrintStatement");
      expect(ast.body[0].expression.type).toBe("StringLiteral");
    });

    it("parses number literals", () => {
      const ast = parse("let x = 42");
      expect(ast.body[0].value.type).toBe("NumberLiteral");
      expect(ast.body[0].value.value).toBe(42);
    });

    it("parses float literals", () => {
      const ast = parse("let x = 3.14");
      expect(ast.body[0].value.type).toBe("NumberLiteral");
      expect(ast.body[0].value.value).toBeCloseTo(3.14);
    });

    it("parses boolean literals", () => {
      const ast = parse("let x = true");
      expect(ast.body[0].value.type).toBe("BooleanLiteral");
      expect(ast.body[0].value.value).toBe(true);
    });

    it("parses null literal", () => {
      const ast = parse("let x = null");
      expect(ast.body[0].value.type).toBe("NullLiteral");
    });

    it("parses array literals", () => {
      const ast = parse("let x = [1, 2, 3]");
      expect(ast.body[0].value.type).toBe("ArrayLiteral");
      expect(ast.body[0].value.elements).toHaveLength(3);
    });

    it("parses object literals", () => {
      const ast = parse('let x = { name: "test", value: 42 }');
      expect(ast.body[0].value.type).toBe("ObjectLiteral");
      expect(ast.body[0].value.properties).toHaveLength(2);
    });
  });

  describe("comments", () => {
    it("handles line comments", () => {
      const ast = parse('// this is a comment\nlet x = 1');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe("LetDeclaration");
    });

    it("handles block comments", () => {
      const ast = parse('/* block comment */ let x = 1');
      expect(ast.body).toHaveLength(1);
    });
  });

  describe("type declarations", () => {
    it("parses basic type declaration", () => {
      const ast = parse("type Foo {\n  name: string\n  age: int\n}");
      expect(ast.body[0].type).toBe("TypeDeclaration");
      expect(ast.body[0].name).toBe("Foo");
      expect(ast.body[0].fields).toHaveLength(2);
      expect(ast.body[0].fields[0].name).toBe("name");
      expect(ast.body[0].fields[0].typeExpr.type).toBe("PrimitiveType");
      expect(ast.body[0].fields[0].typeExpr.name).toBe("string");
    });

    it("parses annotations on fields", () => {
      const ast = parse('type Foo {\n  @description("A name")\n  name: string\n}');
      expect(ast.body[0].fields[0].annotations).toHaveLength(1);
      expect(ast.body[0].fields[0].annotations[0].name).toBe("description");
      expect(ast.body[0].fields[0].annotations[0].value).toBe("A name");
    });

    it("parses optional types", () => {
      const ast = parse("type Foo {\n  value: string?\n}");
      expect(ast.body[0].fields[0].typeExpr.type).toBe("OptionalType");
      expect(ast.body[0].fields[0].typeExpr.innerType.type).toBe("PrimitiveType");
    });

    it("parses array types", () => {
      const ast = parse("type Foo {\n  items: string[]\n}");
      expect(ast.body[0].fields[0].typeExpr.type).toBe("ArrayType");
      expect(ast.body[0].fields[0].typeExpr.elementType.name).toBe("string");
    });

    it("parses union types", () => {
      const ast = parse("type Foo {\n  value: string | int\n}");
      expect(ast.body[0].fields[0].typeExpr.type).toBe("UnionType");
      expect(ast.body[0].fields[0].typeExpr.members).toHaveLength(2);
    });

    it("parses Confident types", () => {
      const ast = parse("type Foo {\n  result: Confident<string>\n}");
      expect(ast.body[0].fields[0].typeExpr.type).toBe("ConfidentType");
      expect(ast.body[0].fields[0].typeExpr.innerType.name).toBe("string");
    });
  });

  describe("function declarations", () => {
    it("parses basic function", () => {
      const ast = parse('fn greet(name: string) {\n  print name\n}');
      expect(ast.body[0].type).toBe("FunctionDeclaration");
      expect(ast.body[0].name).toBe("greet");
      expect(ast.body[0].params).toHaveLength(1);
      expect(ast.body[0].body).toHaveLength(1);
    });

    it("parses function with return type", () => {
      const ast = parse('fn add(a: int, b: int): int {\n  let x = 1\n}');
      expect(ast.body[0].returnType.type).toBe("PrimitiveType");
      expect(ast.body[0].returnType.name).toBe("int");
    });
  });

  describe("think expressions", () => {
    it("parses basic think expression", () => {
      const ast = parse('let x = think<string>("Hello")');
      expect(ast.body[0].value.type).toBe("ThinkExpression");
      expect(ast.body[0].value.typeArgument.type).toBe("PrimitiveType");
      expect(ast.body[0].value.typeArgument.name).toBe("string");
      expect(ast.body[0].value.prompt.value).toBe("Hello");
    });

    it("parses think with named type", () => {
      const ast = parse('type Foo {\n  name: string\n}\nlet x = think<Foo>("test")');
      expect(ast.body[1].value.typeArgument.type).toBe("NamedType");
      expect(ast.body[1].value.typeArgument.name).toBe("Foo");
    });

    it("parses think with Confident type", () => {
      const ast = parse('let x = think<Confident<string>>("test")');
      expect(ast.body[0].value.typeArgument.type).toBe("ConfidentType");
    });

    it("parses think with context", () => {
      const ast = parse('let x = think<string>("test")\n  with context: data');
      expect(ast.body[0].value.withContext).not.toBeNull();
      expect(ast.body[0].value.withContext.type).toBe("IdentifierExpression");
      expect(ast.body[0].value.withContext.name).toBe("data");
    });

    it("parses think with context block", () => {
      const ast = parse('let x = think<string>("test")\n  with context: { a, b }');
      expect(ast.body[0].value.withContext.type).toBe("ContextBlock");
      expect(ast.body[0].value.withContext.entries).toHaveLength(2);
    });

    it("parses think with dot access context", () => {
      const ast = parse('let x = think<string>("test")\n  with context: review.text');
      expect(ast.body[0].value.withContext.type).toBe("MemberExpression");
    });
  });

  describe("infer expressions", () => {
    it("parses basic infer", () => {
      const ast = parse('let x = infer<string>("hello", "detect language")');
      expect(ast.body[0].value.type).toBe("InferExpression");
      expect(ast.body[0].value.value.value).toBe("hello");
      expect(ast.body[0].value.hint.value).toBe("detect language");
    });

    it("parses infer without hint", () => {
      const ast = parse('let x = infer<string>("hello")');
      expect(ast.body[0].value.type).toBe("InferExpression");
      expect(ast.body[0].value.hint).toBeNull();
    });
  });

  describe("pipeline expressions", () => {
    it("parses pipeline operator", () => {
      const ast = parse("let x = a |> b |> c");
      expect(ast.body[0].value.type).toBe("PipelineExpression");
      expect(ast.body[0].value.stages).toHaveLength(3);
    });
  });

  describe("member expressions", () => {
    it("parses dot access", () => {
      const ast = parse("let x = foo.bar");
      expect(ast.body[0].value.type).toBe("MemberExpression");
      expect(ast.body[0].value.property).toBe("bar");
    });

    it("parses chained dot access", () => {
      const ast = parse("let x = foo.bar.baz");
      expect(ast.body[0].value.type).toBe("MemberExpression");
      expect(ast.body[0].value.property).toBe("baz");
      expect(ast.body[0].value.object.type).toBe("MemberExpression");
    });
  });

  describe("Phase 2: uncertain modifier", () => {
    it("parses uncertain let declaration", () => {
      const ast = parse('let uncertain x = think<string>("test")');
      expect(ast.body[0].type).toBe("LetDeclaration");
      expect(ast.body[0].isUncertain).toBe(true);
    });
  });

  describe("Phase 2: reason blocks", () => {
    it("parses reason block", () => {
      const ast = parse(`let x = reason<string> {
  goal: "Analyze something"
  steps:
    1. "First step"
    2. "Second step"
}`);
      expect(ast.body[0].value.type).toBe("ReasonBlock");
      expect(ast.body[0].value.goal).toBe("Analyze something");
      expect(ast.body[0].value.steps).toHaveLength(2);
      expect(ast.body[0].value.steps[0].number).toBe(1);
      expect(ast.body[0].value.steps[0].description).toBe("First step");
    });
  });

  describe("Phase 2: guard and on_fail", () => {
    it("parses guard clause on think", () => {
      const ast = parse('let x = think<string>("test")\n  guard {\n    length: 10..500\n  }');
      expect(ast.body[0].value.guard).not.toBeNull();
      expect(ast.body[0].value.guard.rules).toHaveLength(1);
      expect(ast.body[0].value.guard.rules[0].name).toBe("length");
    });

    it("parses on_fail clause", () => {
      const ast = parse('let x = think<string>("test")\n  guard {\n    length: 10..500\n  }\n  on_fail: retry(3)');
      expect(ast.body[0].value.onFail).not.toBeNull();
      expect(ast.body[0].value.onFail.retryCount).toBe(3);
    });

    it("parses on_fail with fallback", () => {
      const ast = parse('let x = think<string>("test")\n  guard {\n    length: 10..500\n  }\n  on_fail: retry(3) then fallback("default")');
      expect(ast.body[0].value.onFail.fallback.type).toBe("StringLiteral");
      expect(ast.body[0].value.onFail.fallback.value).toBe("default");
    });
  });

  describe("Phase 2: match expressions", () => {
    it("parses match with object patterns", () => {
      const ast = parse('let x = match result {\n  { confidence: >= 0.9 } => "high"\n  _ => "low"\n}');
      expect(ast.body[0].value.type).toBe("MatchExpression");
      expect(ast.body[0].value.arms).toHaveLength(2);
      expect(ast.body[0].value.arms[0].pattern.type).toBe("ObjectPattern");
      expect(ast.body[0].value.arms[1].pattern.type).toBe("WildcardPattern");
    });
  });

  describe("Phase 2: try/catch", () => {
    it("parses try/catch block", () => {
      const ast = parse('try {\n  let x = 1\n} catch SchemaViolation (e) {\n  print "error"\n}');
      expect(ast.body[0].type).toBe("TryCatch");
      expect(ast.body[0].tryBody).toHaveLength(1);
      expect(ast.body[0].catchClauses).toHaveLength(1);
      expect(ast.body[0].catchClauses[0].errorType).toBe("SchemaViolation");
      expect(ast.body[0].catchClauses[0].binding).toBe("e");
    });

    it("parses multiple catch clauses", () => {
      const ast = parse('try {\n  let x = 1\n} catch SchemaViolation (e) {\n  print "schema"\n} catch ConfidenceTooLow (e) {\n  print "confidence"\n}');
      expect(ast.body[0].catchClauses).toHaveLength(2);
    });
  });

  describe("Phase 2: if/else", () => {
    it("parses if statement", () => {
      const ast = parse('if true {\n  print "yes"\n}');
      expect(ast.body[0].type).toBe("IfElse");
      expect(ast.body[0].condition.type).toBe("BooleanLiteral");
      expect(ast.body[0].thenBody).toHaveLength(1);
      expect(ast.body[0].elseBody).toBeNull();
    });

    it("parses if/else statement", () => {
      const ast = parse('if true {\n  print "yes"\n} else {\n  print "no"\n}');
      expect(ast.body[0].elseBody).toHaveLength(1);
    });
  });

  describe("Phase 2: operators", () => {
    it("parses comparison operators", () => {
      const ast = parse("let x = a >= 5");
      expect(ast.body[0].value.type).toBe("BinaryExpression");
      expect(ast.body[0].value.operator).toBe(">=");
    });

    it("parses logical operators", () => {
      const ast = parse("let x = a && b");
      expect(ast.body[0].value.type).toBe("BinaryExpression");
      expect(ast.body[0].value.operator).toBe("&&");
    });

    it("parses unary not", () => {
      const ast = parse("let x = !a");
      expect(ast.body[0].value.type).toBe("UnaryExpression");
      expect(ast.body[0].value.operator).toBe("!");
    });

    it("parses equality operators", () => {
      const ast = parse('let x = a == "test"');
      expect(ast.body[0].value.operator).toBe("==");
    });
  });

  describe("Phase 2: without context", () => {
    it("parses without context clause", () => {
      const ast = parse('let x = think<string>("test")\n  with context: data\n  without context: secret');
      expect(ast.body[0].value.withoutContext).not.toBeNull();
      expect(ast.body[0].value.withoutContext.name).toBe("secret");
    });
  });
});
