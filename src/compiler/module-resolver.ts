import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import type {
  ImportDeclarationNode,
  TypeDeclarationNode,
  FunctionDeclarationNode,
  ProgramNode,
} from "../ast/nodes.js";
import { parse } from "../parser/index.js";

export interface ResolveResult {
  importedTypes: Map<string, TypeDeclarationNode>;
  importedFunctions: FunctionDeclarationNode[];
  errors: string[];
}

export async function resolveImports(
  imports: ImportDeclarationNode[],
  importingFilePath: string,
  resolving: Set<string> = new Set()
): Promise<ResolveResult> {
  const importedTypes = new Map<string, TypeDeclarationNode>();
  const importedFunctions: FunctionDeclarationNode[] = [];
  const errors: string[] = [];

  const importingDir = dirname(importingFilePath);
  const normalizedImporting = resolve(importingFilePath);
  resolving.add(normalizedImporting);

  for (const imp of imports) {
    // Resolve the path relative to the importing file
    let targetPath = imp.path;
    if (!targetPath.endsWith(".tl")) {
      targetPath += ".tl";
    }
    const fullPath = resolve(importingDir, targetPath);

    // Check for circular imports
    if (resolving.has(fullPath)) {
      errors.push(`Circular import detected: ${imp.path} (from ${importingFilePath})`);
      continue;
    }

    // Check file exists
    if (!existsSync(fullPath)) {
      errors.push(`Import not found: ${imp.path} (resolved to ${fullPath})`);
      continue;
    }

    // Read and parse the imported file
    let ast: ProgramNode;
    try {
      const source = readFileSync(fullPath, "utf-8");
      ast = await parse(source);
    } catch (e: any) {
      errors.push(`Failed to parse ${imp.path}: ${e.message}`);
      continue;
    }

    // Recursively resolve imports of the imported file (for its own consistency)
    if (ast.imports && ast.imports.length > 0) {
      const nestedResult = await resolveImports(ast.imports, fullPath, new Set(resolving));
      if (nestedResult.errors.length > 0) {
        errors.push(...nestedResult.errors);
        continue;
      }
      // Do NOT propagate nested imports to the importer — no transitive re-export
    }

    // Collect exported types and functions
    const availableTypes = new Map<string, TypeDeclarationNode>();
    const availableFunctions = new Map<string, FunctionDeclarationNode>();

    for (const stmt of ast.body) {
      if (stmt.type === "TypeDeclaration") {
        availableTypes.set(stmt.name, stmt);
      } else if (stmt.type === "FunctionDeclaration") {
        availableFunctions.set(stmt.name, stmt);
      }
    }

    // Resolve each requested name
    for (const name of imp.names) {
      if (availableTypes.has(name)) {
        importedTypes.set(name, availableTypes.get(name)!);
      } else if (availableFunctions.has(name)) {
        importedFunctions.push(availableFunctions.get(name)!);
      } else {
        errors.push(`"${name}" is not exported by ${imp.path}`);
      }
    }
  }

  resolving.delete(normalizedImporting);

  return { importedTypes, importedFunctions, errors };
}
