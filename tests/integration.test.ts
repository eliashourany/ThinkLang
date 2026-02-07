import { describe, it, expect } from "vitest";
import { compile } from "../src/compiler/index.js";

describe("Integration Tests — End-to-end compile", () => {
  it("compiles hello-think example", async () => {
    const source = `let greeting = think<string>("Say hello to the world in a creative way")
print greeting`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("__tl_runtime.think(");
    expect(result.code).toContain("console.log");
    expect(result.code).toContain("__tl_main");
  });

  it("compiles classification example with type declaration", async () => {
    const source = `type Classification {
  category: string
  confidence: float
  explanation: string
}

let email = "You've won!"

let result = think<Classification>("Classify this email")
  with context: email

print result`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("interface Classification");
    expect(result.code).toContain("__tl_runtime.think(");
    expect(result.code).toContain('"type":"object"');
  });

  it("compiles extraction example with nested types", async () => {
    const source = `type Person {
  name: string
  role: string
  company: string?
}

type ExtractionResult {
  people: Person[]
  summary: string
}

let doc = "John met Jane"
let extracted = think<ExtractionResult>("Extract people")
  with context: doc

print extracted`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("interface Person");
    expect(result.code).toContain("interface ExtractionResult");
  });

  it("compiles Confident type usage", async () => {
    const source = `type Sentiment {
  label: string
  intensity: int
}

let review = "Great product!"
let sentiment = think<Confident<Sentiment>>("Analyze sentiment")
  with context: review

print sentiment`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('"confidence"');
  });

  it("compiles infer expression", async () => {
    const source = `let lang = infer<string>("Bonjour", "Detect language")
print lang`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("__tl_runtime.infer(");
  });

  it("compiles context block with multiple entries", async () => {
    const source = `let a = "text"
let b = "more"
let result = think<string>("Test")
  with context: { a, b }

print result`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("context:");
  });

  it("compiles function declarations", async () => {
    const source = `fn greet(name: string): string {
  let msg = think<string>("Generate a greeting")
    with context: name
  print msg
}`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("async function greet");
  });

  it("compiles multi-step example with sequential think calls", async () => {
    const source = `type Step1 {
  items: string[]
}

type Step2 {
  summary: string
}

let data = "some data"
let step1 = think<Step1>("Extract items")
  with context: data
let step2 = think<Step2>("Summarize")
  with context: {
    step1,
    data,
  }

print step1
print step2`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    // Both think calls should be present
    const thinkCount = (result.code.match(/__tl_runtime\.think\(/g) || []).length;
    expect(thinkCount).toBe(2);
  });

  it("compiles reason block", async () => {
    const source = `type Analysis {
  recommendation: string
}

let data = "Market data"
let analysis = reason<Analysis> {
  goal: "Analyze portfolio"
  steps:
    1. "Evaluate allocation"
    2. "Assess risks"
  with context: data
}

print analysis`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("__tl_runtime.reason(");
  });

  it("compiles try/catch with ThinkError", async () => {
    const source = `try {
  let x = think<string>("test")
  print x
} catch SchemaViolation (e) {
  print "schema error"
}`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("try {");
    expect(result.code).toContain("SchemaViolation");
  });

  it("compiles match expression", async () => {
    const source = `let x = 42
let label = match x {
  { value: >= 90 } => "high"
  { value: >= 50 } => "medium"
  _ => "low"
}
print label`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain(">= 90");
  });

  it("compiles if/else", async () => {
    const source = `let x = true
if x {
  print "yes"
} else {
  print "no"
}`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("if (x)");
    expect(result.code).toContain("else");
  });

  it("compiles guard with on_fail", async () => {
    const source = `let result = think<string>("Translate")
  guard {
    length: 5..500
  }
  on_fail: retry(3)
print result`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("guards:");
    expect(result.code).toContain("retryCount: 3");
  });

  it("produces valid TypeScript output structure", async () => {
    const source = `let x = "hello"
print x`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    // Should have import, main function, and catch
    expect(result.code).toContain("import * as __tl_runtime");
    expect(result.code).toContain("async function __tl_main()");
    expect(result.code).toContain(".catch(console.error)");
  });
});
