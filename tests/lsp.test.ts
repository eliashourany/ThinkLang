import { describe, it, expect, beforeAll } from "vitest";
import { DocumentManager } from "../src/lsp/document-manager.js";
import { provideHover } from "../src/lsp/hover-provider.js";
import { provideDocumentSymbols } from "../src/lsp/symbols-provider.js";
import { provideDefinition } from "../src/lsp/definition-provider.js";
import { SymbolKind } from "vscode-languageserver";

let docManager: DocumentManager;

beforeAll(async () => {
  docManager = new DocumentManager();
  await docManager.init();
});

describe("DocumentManager", () => {
  it("analyzes a simple program without errors", () => {
    const state = docManager.analyze("file:///test.tl", 'let x = "hello"\nprint x');
    expect(state.diagnostics).toHaveLength(0);
    expect(state.ast).not.toBeNull();
  });

  it("produces parse error diagnostics for invalid syntax", () => {
    const state = docManager.analyze("file:///bad.tl", 'let = invalid');
    expect(state.diagnostics.length).toBeGreaterThan(0);
    expect(state.diagnostics[0].message).toBeDefined();
  });

  it("produces type checker error diagnostics", () => {
    const state = docManager.analyze("file:///uncertain.tl", `
let result = think<string>("test")
let x = result.length
`);
    expect(state.diagnostics.length).toBeGreaterThan(0);
    expect(state.diagnostics[0].message).toContain("uncertain");
  });

  it("collects type declarations", () => {
    const state = docManager.analyze("file:///types.tl", `
type Sentiment {
  label: string
  score: float
}
let x = "test"
`);
    expect(state.typeDecls.has("Sentiment")).toBe(true);
    expect(state.diagnostics).toHaveLength(0);
  });

  it("builds symbol index", () => {
    const state = docManager.analyze("file:///symbols.tl", `
type MyType {
  name: string
}
fn greet(name: string): string {
  print name
}
let x = "hello"
`);
    expect(state.symbolIndex.get("MyType")).toBeDefined();
    expect(state.symbolIndex.get("MyType")!.kind).toBe("type");
    expect(state.symbolIndex.get("greet")).toBeDefined();
    expect(state.symbolIndex.get("greet")!.kind).toBe("function");
    expect(state.symbolIndex.get("x")).toBeDefined();
    expect(state.symbolIndex.get("x")!.kind).toBe("variable");
  });

  it("builds enriched scope with variable types", () => {
    const state = docManager.analyze("file:///scope.tl", `
let name = "Alice"
let age = 30
`);
    const nameBinding = state.scope.lookup("name");
    expect(nameBinding).toBeDefined();
    expect(nameBinding!.type.kind).toBe("primitive");

    const ageBinding = state.scope.lookup("age");
    expect(ageBinding).toBeDefined();
  });
});

describe("Document Symbols", () => {
  it("provides document symbols for types, functions, and variables", () => {
    const state = docManager.analyze("file:///doc-syms.tl", `
type Foo {
  bar: string
}
fn baz(x: int): string {
  print x
}
let qux = 42
`);
    const symbols = provideDocumentSymbols(state);
    expect(symbols).toHaveLength(3);

    const typeSymbol = symbols.find(s => s.name === "Foo");
    expect(typeSymbol).toBeDefined();
    expect(typeSymbol!.kind).toBe(SymbolKind.Struct);
    expect(typeSymbol!.children).toHaveLength(1);
    expect(typeSymbol!.children![0].name).toBe("bar");

    const fnSymbol = symbols.find(s => s.name === "baz");
    expect(fnSymbol).toBeDefined();
    expect(fnSymbol!.kind).toBe(SymbolKind.Function);

    const varSymbol = symbols.find(s => s.name === "qux");
    expect(varSymbol).toBeDefined();
    expect(varSymbol!.kind).toBe(SymbolKind.Variable);
  });
});

describe("Definition Provider", () => {
  it("returns definition location for type reference", () => {
    const source = `type Sentiment {
  label: string
}
let x = think<Sentiment>("test")`;
    const state = docManager.analyze("file:///def.tl", source);

    // Position at 'Sentiment' on line 4 (0-based line 3)
    // think<Sentiment> — Sentiment starts at column 14 (0-based)
    const result = provideDefinition(state, { line: 3, character: 15 }, "file:///def.tl");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.uri).toBe("file:///def.tl");
      expect(result.range.start.line).toBe(0); // type declaration is at line 0
    }
  });
});
