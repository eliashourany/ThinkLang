import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "path";
import { fileURLToPath } from "url";

const fixturesDir = resolve(fileURLToPath(import.meta.url), "..", "fixtures");

let parse: (source: string) => any;

beforeAll(async () => {
  const mod = await import("../src/parser/generated-parser.js");
  parse = mod.parse;
});

describe("Import System — Grammar", () => {
  it("parses a single import statement", () => {
    const ast = parse('import { Foo } from "./types.tl"\nlet x = 1');
    expect(ast.imports).toHaveLength(1);
    expect(ast.imports[0].type).toBe("ImportDeclaration");
    expect(ast.imports[0].names).toEqual(["Foo"]);
    expect(ast.imports[0].path).toBe("./types.tl");
    expect(ast.body).toHaveLength(1);
  });

  it("parses multiple names in one import", () => {
    const ast = parse('import { Foo, Bar, Baz } from "./types.tl"\nlet x = 1');
    expect(ast.imports).toHaveLength(1);
    expect(ast.imports[0].names).toEqual(["Foo", "Bar", "Baz"]);
  });

  it("parses multiple import statements", () => {
    const ast = parse(
      'import { Foo } from "./types.tl"\nimport { Bar } from "./other.tl"\nlet x = 1'
    );
    expect(ast.imports).toHaveLength(2);
    expect(ast.imports[0].names).toEqual(["Foo"]);
    expect(ast.imports[0].path).toBe("./types.tl");
    expect(ast.imports[1].names).toEqual(["Bar"]);
    expect(ast.imports[1].path).toBe("./other.tl");
  });

  it("parses program with no imports (imports array is empty)", () => {
    const ast = parse("let x = 1");
    expect(ast.imports).toEqual([]);
    expect(ast.body).toHaveLength(1);
  });

  it("parses imports with single-quoted paths", () => {
    const ast = parse("import { Foo } from './types.tl'\nlet x = 1");
    expect(ast.imports[0].path).toBe("./types.tl");
  });

  it("parses program with only imports and no body", () => {
    const ast = parse('import { Foo } from "./types.tl"');
    expect(ast.imports).toHaveLength(1);
    expect(ast.body).toEqual([]);
  });
});

describe("Import System — Module Resolver", () => {
  let resolveImports: any;

  beforeAll(async () => {
    const mod = await import("../src/compiler/module-resolver.js");
    resolveImports = mod.resolveImports;
  });

  it("resolves types from an imported file", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["Sentiment", "Review"], path: "./types.tl" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(0);
    expect(result.importedTypes.has("Sentiment")).toBe(true);
    expect(result.importedTypes.has("Review")).toBe(true);
    expect(result.importedTypes.get("Sentiment")!.fields).toHaveLength(2);
  });

  it("resolves functions from an imported file", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["analyzeSentiment", "greetUser"], path: "./helpers.tl" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(0);
    expect(result.importedFunctions).toHaveLength(2);
    expect(result.importedFunctions[0].name).toBe("analyzeSentiment");
    expect(result.importedFunctions[1].name).toBe("greetUser");
  });

  it("returns error for missing file", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["Foo"], path: "./nonexistent.tl" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Import not found");
  });

  it("returns error for name not exported by file", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["NonExistent"], path: "./types.tl" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('"NonExistent" is not exported');
  });

  it("detects circular imports", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["TypeA"], path: "./circular-a.tl" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Circular import");
  });

  it("auto-appends .tl extension if missing", async () => {
    const imports = [
      { type: "ImportDeclaration" as const, names: ["Sentiment"], path: "./types" },
    ];
    const importingFile = resolve(fixturesDir, "test-main.tl");

    const result = await resolveImports(imports, importingFile);
    expect(result.errors).toHaveLength(0);
    expect(result.importedTypes.has("Sentiment")).toBe(true);
  });
});

describe("Import System — Compiler Integration", () => {
  let compile: any;

  beforeAll(async () => {
    const mod = await import("../src/compiler/index.js");
    compile = mod.compile;
  });

  it("compiles file with imported types", async () => {
    const source = `import { Sentiment } from "./types.tl"
let s = think<Sentiment>("Analyze this")
print s`;
    const filePath = resolve(fixturesDir, "test-main.tl");
    const result = await compile(source, { filePath });

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("interface Sentiment");
    expect(result.code).toContain("__tl_runtime.think(");
  });

  it("compiles file with imported functions", async () => {
    const source = `import { analyzeSentiment } from "./helpers.tl"
let result = analyzeSentiment("Great product!")
print result`;
    const filePath = resolve(fixturesDir, "test-main.tl");
    const result = await compile(source, { filePath });

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("async function analyzeSentiment");
  });

  it("returns error when imports present but no filePath", async () => {
    const source = `import { Foo } from "./types.tl"
let x = 1`;
    const result = await compile(source);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("file path");
  });

  it("compiles file without imports normally", async () => {
    const source = `let x = "hello"
print x`;
    const result = await compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('const x = "hello"');
  });
});
