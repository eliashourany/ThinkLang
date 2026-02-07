import {
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import type * as AST from "../ast/nodes.js";
import type { TypeDeclMap } from "../compiler/type-compiler.js";
import { loadParser, parseSync } from "../parser/index.js";
import { check } from "../checker/checker.js";
import { SymbolIndex } from "./symbol-index.js";
import { EnrichedScope, collectScopes } from "./scope-collector.js";
import { astLocationToRange } from "./utils.js";

export interface DocumentState {
  uri: string;
  ast: AST.ProgramNode | null;
  typeDecls: TypeDeclMap;
  diagnostics: Diagnostic[];
  symbolIndex: SymbolIndex;
  scope: EnrichedScope;
}

export class DocumentManager {
  private states = new Map<string, DocumentState>();
  private parserReady = false;

  readonly documents = new TextDocuments(TextDocument);

  async init(): Promise<void> {
    await loadParser();
    this.parserReady = true;
  }

  analyze(uri: string, text: string): DocumentState {
    const diagnostics: Diagnostic[] = [];
    let ast: AST.ProgramNode | null = null;
    let typeDecls: TypeDeclMap = new Map();
    let symbolIndex = new SymbolIndex();
    let scope = new EnrichedScope();

    if (!this.parserReady) {
      this.states.set(uri, { uri, ast, typeDecls, diagnostics, symbolIndex, scope });
      return this.states.get(uri)!;
    }

    // Step 1: Parse
    try {
      ast = parseSync(text);
    } catch (e: any) {
      const loc = e.location;
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: loc
          ? {
              start: { line: loc.start.line - 1, character: loc.start.column - 1 },
              end: { line: loc.end?.line ? loc.end.line - 1 : loc.start.line - 1, character: loc.end?.column ? loc.end.column - 1 : loc.start.column },
            }
          : { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: e.message,
        source: "thinklang",
      });
    }

    if (ast) {
      // Step 2: Collect type declarations
      for (const stmt of ast.body) {
        if (stmt.type === "TypeDeclaration") {
          typeDecls.set(stmt.name, stmt);
        }
      }

      // Step 3: Type check
      const checkResult = check(ast, typeDecls);

      for (const err of checkResult.errors) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: err.location
            ? astLocationToRange(err.location)
            : { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          message: err.message,
          source: "thinklang",
        });
      }

      for (const warn of checkResult.warnings) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: warn.location
            ? astLocationToRange(warn.location)
            : { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          message: warn.message,
          source: "thinklang",
        });
      }

      // Step 4: Build symbol index and enriched scope
      symbolIndex = SymbolIndex.fromAst(ast);
      scope = collectScopes(ast, typeDecls);
    }

    const state: DocumentState = { uri, ast, typeDecls, diagnostics, symbolIndex, scope };
    this.states.set(uri, state);
    return state;
  }

  getState(uri: string): DocumentState | undefined {
    return this.states.get(uri);
  }
}
