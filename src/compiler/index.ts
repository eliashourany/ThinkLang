import { parse } from "../parser/index.js";
import { generate, type GeneratorOptions } from "./code-generator.js";
import { type TypeDeclMap } from "./type-compiler.js";
import { check } from "../checker/checker.js";
import type { ProgramNode, TypeDeclarationNode, FunctionDeclarationNode } from "../ast/nodes.js";
import { resolveImports } from "./module-resolver.js";

export interface CompileOptions extends GeneratorOptions {
  filePath?: string;
}

export interface CompileResult {
  code: string;
  errors: string[];
  warnings: string[];
}

export async function compile(
  source: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  // Step 1: Parse
  const ast = await parse(source);

  // Step 2: Resolve imports
  let importedTypes = new Map<string, TypeDeclarationNode>();
  let importedFunctions: FunctionDeclarationNode[] = [];

  if (ast.imports && ast.imports.length > 0) {
    if (!options.filePath) {
      return {
        code: "",
        errors: ["Imports require a file path to resolve relative paths"],
        warnings: [],
      };
    }

    const resolveResult = await resolveImports(ast.imports, options.filePath);
    if (resolveResult.errors.length > 0) {
      return {
        code: "",
        errors: resolveResult.errors,
        warnings: [],
      };
    }

    importedTypes = resolveResult.importedTypes;
    importedFunctions = resolveResult.importedFunctions;
  }

  // Step 3: Collect type declarations (local + imported)
  const typeDecls = collectTypeDeclarations(ast);
  for (const [name, decl] of importedTypes) {
    typeDecls.set(name, decl);
  }

  // Step 4: Type check
  const checkResult = check(ast, typeDecls, importedFunctions);

  if (checkResult.errors.length > 0) {
    return {
      code: "",
      errors: checkResult.errors.map(e => e.message),
      warnings: checkResult.warnings.map(w => w.message),
    };
  }

  // Step 5: Generate TypeScript code
  const code = generate(ast, typeDecls, options, importedFunctions);

  return {
    code,
    errors: [],
    warnings: checkResult.warnings.map(w => w.message),
  };
}

export async function compileToAst(source: string): Promise<ProgramNode> {
  return parse(source);
}

function collectTypeDeclarations(ast: ProgramNode): TypeDeclMap {
  const decls: TypeDeclMap = new Map();

  for (const stmt of ast.body) {
    if (stmt.type === "TypeDeclaration") {
      decls.set(stmt.name, stmt as TypeDeclarationNode);
    }
  }

  return decls;
}
