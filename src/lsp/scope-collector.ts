import type * as AST from "../ast/nodes.js";
import type { Location } from "../ast/nodes.js";
import type { TypeDeclMap } from "../compiler/type-compiler.js";
import { resolveTypeExpression } from "../checker/checker.js";
import {
  type TlType,
  makeUnknown,
  makeUncertain,
  makeString,
  makeInt,
  makeFloat,
  makeBool,
  makeNull,
} from "../checker/types.js";

export interface Binding {
  name: string;
  type: TlType;
  location?: Location;
}

export class EnrichedScope {
  private bindings = new Map<string, Binding>();
  readonly parent: EnrichedScope | null;
  readonly location?: Location;

  constructor(parent: EnrichedScope | null = null, location?: Location) {
    this.parent = parent;
    this.location = location;
  }

  define(binding: Binding): void {
    this.bindings.set(binding.name, binding);
  }

  lookup(name: string): Binding | undefined {
    const local = this.bindings.get(name);
    if (local) return local;
    return this.parent?.lookup(name);
  }

  allBindings(): Binding[] {
    const result = new Map<string, Binding>();
    this.collectBindings(result);
    return Array.from(result.values());
  }

  private collectBindings(result: Map<string, Binding>): void {
    if (this.parent) {
      this.parent.collectBindings(result);
    }
    for (const [name, binding] of this.bindings) {
      result.set(name, binding);
    }
  }

  child(location?: Location): EnrichedScope {
    return new EnrichedScope(this, location);
  }
}

export function collectScopes(
  program: AST.ProgramNode,
  typeDecls: TypeDeclMap
): EnrichedScope {
  const rootScope = new EnrichedScope(null, program.location);
  collectStatementsScopes(program.body, rootScope, typeDecls);
  return rootScope;
}

function collectStatementsScopes(
  stmts: AST.StatementNode[],
  scope: EnrichedScope,
  typeDecls: TypeDeclMap
): void {
  for (const stmt of stmts) {
    collectStatementScopes(stmt, scope, typeDecls);
  }
}

function collectStatementScopes(
  stmt: AST.StatementNode,
  scope: EnrichedScope,
  typeDecls: TypeDeclMap
): void {
  switch (stmt.type) {
    case "TypeDeclaration":
      // Types are registered in typeDecls map, no variable binding needed
      break;

    case "ToolDeclaration": {
      const toolParamTypes = stmt.params.map(p => resolveTypeExpression(p.typeExpr, typeDecls));
      const toolReturnType = resolveTypeExpression(stmt.returnType, typeDecls);
      scope.define({
        name: stmt.name,
        type: { kind: "function", params: toolParamTypes, returnType: toolReturnType },
        location: stmt.location,
      });
      const toolScope = scope.child(stmt.location);
      for (const param of stmt.params) {
        toolScope.define({
          name: param.name,
          type: resolveTypeExpression(param.typeExpr, typeDecls),
          location: param.location,
        });
      }
      collectStatementsScopes(stmt.body, toolScope, typeDecls);
      break;
    }

    case "FunctionDeclaration": {
      const paramTypes = stmt.params.map(p => resolveTypeExpression(p.typeExpr, typeDecls));
      const returnType = stmt.returnType ? resolveTypeExpression(stmt.returnType, typeDecls) : makeUnknown();
      scope.define({
        name: stmt.name,
        type: { kind: "function", params: paramTypes, returnType },
        location: stmt.location,
      });
      const fnScope = scope.child(stmt.location);
      for (const param of stmt.params) {
        fnScope.define({
          name: param.name,
          type: resolveTypeExpression(param.typeExpr, typeDecls),
          location: param.location,
        });
      }
      collectStatementsScopes(stmt.body, fnScope, typeDecls);
      break;
    }

    case "LetDeclaration": {
      let valueType = inferExprType(stmt.value, typeDecls);
      if (stmt.isUncertain) {
        valueType = makeUncertain(valueType);
      } else if (
        (stmt.value.type === "ThinkExpression" || stmt.value.type === "InferExpression") &&
        valueType.kind !== "confident"
      ) {
        valueType = makeUncertain(valueType);
      }
      scope.define({
        name: stmt.name,
        type: valueType,
        location: stmt.location,
      });
      break;
    }

    case "TryCatch": {
      const tryScope = scope.child(stmt.location);
      collectStatementsScopes(stmt.tryBody, tryScope, typeDecls);
      for (const clause of stmt.catchClauses) {
        const catchScope = scope.child(clause.location);
        catchScope.define({
          name: clause.binding,
          type: makeUnknown(),
          location: clause.location,
        });
        collectStatementsScopes(clause.body, catchScope, typeDecls);
      }
      break;
    }

    case "IfElse": {
      const thenScope = scope.child(stmt.location);
      collectStatementsScopes(stmt.thenBody, thenScope, typeDecls);
      if (stmt.elseBody) {
        const elseScope = scope.child(stmt.location);
        collectStatementsScopes(stmt.elseBody, elseScope, typeDecls);
      }
      break;
    }
  }
}

function inferExprType(expr: AST.ExpressionNode, typeDecls: TypeDeclMap): TlType {
  switch (expr.type) {
    case "ThinkExpression":
    case "InferExpression":
      return resolveTypeExpression(expr.typeArgument, typeDecls);
    case "ReasonBlock":
      return resolveTypeExpression(expr.typeArgument, typeDecls);
    case "AgentExpression":
      return resolveTypeExpression(expr.typeArgument, typeDecls);
    case "StringLiteral":
      return makeString();
    case "NumberLiteral":
      return Number.isInteger(expr.value) ? makeInt() : makeFloat();
    case "BooleanLiteral":
      return makeBool();
    case "NullLiteral":
      return makeNull();
    case "ArrayLiteral":
      if (expr.elements.length === 0) return { kind: "array", elementType: makeUnknown() };
      return { kind: "array", elementType: inferExprType(expr.elements[0], typeDecls) };
    case "ObjectLiteral": {
      const fields = new Map<string, TlType>();
      for (const prop of expr.properties) {
        fields.set(prop.key, inferExprType(prop.value, typeDecls));
      }
      return { kind: "object", name: "anonymous", fields };
    }
    default:
      return makeUnknown();
  }
}
