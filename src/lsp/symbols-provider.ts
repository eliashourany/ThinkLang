import { DocumentSymbol, SymbolKind, Range } from "vscode-languageserver";
import type { DocumentState } from "./document-manager.js";
import { astLocationToRange } from "./utils.js";

export function provideDocumentSymbols(state: DocumentState): DocumentSymbol[] {
  if (!state.ast) return [];

  const symbols: DocumentSymbol[] = [];

  for (const stmt of state.ast.body) {
    const defaultRange: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } };

    switch (stmt.type) {
      case "TypeDeclaration": {
        const range = stmt.location ? astLocationToRange(stmt.location) : defaultRange;
        const children: DocumentSymbol[] = stmt.fields.map(f => ({
          name: f.name,
          kind: SymbolKind.Field,
          range: f.location ? astLocationToRange(f.location) : defaultRange,
          selectionRange: f.location ? astLocationToRange(f.location) : defaultRange,
        }));
        symbols.push({
          name: stmt.name,
          kind: SymbolKind.Struct,
          range,
          selectionRange: range,
          children,
        });
        break;
      }

      case "FunctionDeclaration": {
        const range = stmt.location ? astLocationToRange(stmt.location) : defaultRange;
        symbols.push({
          name: stmt.name,
          kind: SymbolKind.Function,
          range,
          selectionRange: range,
        });
        break;
      }

      case "LetDeclaration": {
        const range = stmt.location ? astLocationToRange(stmt.location) : defaultRange;
        symbols.push({
          name: stmt.name,
          kind: SymbolKind.Variable,
          range,
          selectionRange: range,
        });
        break;
      }
    }
  }

  return symbols;
}
