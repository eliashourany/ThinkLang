import type { TlType } from "./types.js";
import type { TypeDeclarationNode } from "../ast/nodes.js";

export class Scope {
  private variables = new Map<string, TlType>();
  private types = new Map<string, TypeDeclarationNode>();
  readonly parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  define(name: string, type: TlType): void {
    this.variables.set(name, type);
  }

  lookup(name: string): TlType | undefined {
    const local = this.variables.get(name);
    if (local) return local;
    return this.parent?.lookup(name);
  }

  defineType(name: string, decl: TypeDeclarationNode): void {
    this.types.set(name, decl);
  }

  lookupType(name: string): TypeDeclarationNode | undefined {
    const local = this.types.get(name);
    if (local) return local;
    return this.parent?.lookupType(name);
  }

  child(): Scope {
    return new Scope(this);
  }
}
