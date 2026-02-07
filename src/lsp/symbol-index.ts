import type * as AST from "../ast/nodes.js";
import type { Location } from "../ast/nodes.js";
import type { TlType } from "../checker/types.js";

export interface SymbolInfo {
  name: string;
  kind: "type" | "function" | "variable";
  location: Location;
  type?: TlType;
}

export class SymbolIndex {
  private symbols = new Map<string, SymbolInfo>();

  add(info: SymbolInfo): void {
    this.symbols.set(info.name, info);
  }

  get(name: string): SymbolInfo | undefined {
    return this.symbols.get(name);
  }

  all(): SymbolInfo[] {
    return Array.from(this.symbols.values());
  }

  static fromAst(program: AST.ProgramNode): SymbolIndex {
    const index = new SymbolIndex();

    for (const stmt of program.body) {
      switch (stmt.type) {
        case "TypeDeclaration":
          if (stmt.location) {
            index.add({ name: stmt.name, kind: "type", location: stmt.location });
          }
          break;
        case "FunctionDeclaration":
          if (stmt.location) {
            index.add({ name: stmt.name, kind: "function", location: stmt.location });
          }
          break;
        case "LetDeclaration":
          if (stmt.location) {
            index.add({ name: stmt.name, kind: "variable", location: stmt.location });
          }
          break;
      }
    }

    return index;
  }
}
