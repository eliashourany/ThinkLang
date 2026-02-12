import type * as AST from "../ast/nodes.js";
import type { TypeDeclMap } from "../compiler/type-compiler.js";
import { Scope } from "./scope.js";
import {
  type TlType,
  makeString,
  makeInt,
  makeFloat,
  makeBool,
  makeNull,
  makeUnknown,
  makeUncertain,
  makeConfident,
  typeToString,
} from "./types.js";
import {
  type CheckDiagnostic,
  UncertainAccessError,
  NonExhaustiveMatchWarning,
} from "./errors.js";

export interface CheckResult {
  errors: CheckDiagnostic[];
  warnings: CheckDiagnostic[];
}

export function resolveTypeExpression(typeExpr: AST.TypeExpressionNode, typeDecls: TypeDeclMap): TlType {
  return resolveTypeExprStandalone(typeExpr, typeDecls);
}

function resolveTypeExprStandalone(typeExpr: AST.TypeExpressionNode, typeDecls: TypeDeclMap): TlType {
  switch (typeExpr.type) {
    case "PrimitiveType":
      switch (typeExpr.name) {
        case "string": return makeString();
        case "int": return makeInt();
        case "float": return makeFloat();
        case "bool": return makeBool();
        case "null": return makeNull();
      }
      break;
    case "NamedType": {
      const decl = typeDecls.get(typeExpr.name);
      if (decl) {
        const fields = new Map<string, TlType>();
        for (const field of decl.fields) {
          fields.set(field.name, resolveTypeExprStandalone(field.typeExpr, typeDecls));
        }
        return { kind: "object", name: typeExpr.name, fields };
      }
      return makeUnknown();
    }
    case "ArrayType":
      return { kind: "array", elementType: resolveTypeExprStandalone(typeExpr.elementType, typeDecls) };
    case "OptionalType":
      return { kind: "optional", innerType: resolveTypeExprStandalone(typeExpr.innerType, typeDecls) };
    case "UnionType":
      return { kind: "union", members: typeExpr.members.map(m => resolveTypeExprStandalone(m, typeDecls)) };
    case "ConfidentType":
      return makeConfident(resolveTypeExprStandalone(typeExpr.innerType, typeDecls));
  }
  return makeUnknown();
}

export function check(
  program: AST.ProgramNode,
  typeDecls: TypeDeclMap,
  importedFunctions?: AST.FunctionDeclarationNode[]
): CheckResult {
  const checker = new TypeChecker(typeDecls, importedFunctions);
  checker.checkProgram(program);
  return {
    errors: checker.errors,
    warnings: checker.warnings,
  };
}

class TypeChecker {
  errors: CheckDiagnostic[] = [];
  warnings: CheckDiagnostic[] = [];
  private scope: Scope;
  private typeDecls: TypeDeclMap;

  constructor(typeDecls: TypeDeclMap, importedFunctions?: AST.FunctionDeclarationNode[]) {
    this.typeDecls = typeDecls;
    this.scope = new Scope();

    // Register all type declarations in scope
    for (const [name, decl] of typeDecls) {
      this.scope.defineType(name, decl);
    }

    // Register imported functions in scope
    if (importedFunctions) {
      for (const fn of importedFunctions) {
        const paramTypes = fn.params.map(p => this.resolveTypeExpr(p.typeExpr));
        const returnType = fn.returnType ? this.resolveTypeExpr(fn.returnType) : makeUnknown();
        this.scope.define(fn.name, {
          kind: "function",
          params: paramTypes,
          returnType,
        });
      }
    }
  }

  checkProgram(program: AST.ProgramNode): void {
    for (const stmt of program.body) {
      this.checkStatement(stmt);
    }
  }

  private checkStatement(stmt: AST.StatementNode): void {
    switch (stmt.type) {
      case "TypeDeclaration":
        // Already registered in constructor
        break;

      case "ToolDeclaration":
        this.checkToolDeclaration(stmt);
        break;

      case "FunctionDeclaration":
        this.checkFunctionDeclaration(stmt);
        break;

      case "LetDeclaration":
        this.checkLetDeclaration(stmt);
        break;

      case "PrintStatement":
        this.inferExprType(stmt.expression);
        break;

      case "ExpressionStatement":
        this.inferExprType(stmt.expression);
        break;

      case "TryCatch":
        this.checkTryCatch(stmt);
        break;

      case "IfElse":
        this.checkIfElse(stmt);
        break;

      case "TestBlock": {
        const testScope = this.scope.child();
        const prev = this.scope;
        this.scope = testScope;
        for (const bodyStmt of stmt.body) {
          this.checkStatement(bodyStmt);
        }
        this.scope = prev;
        break;
      }

      case "AssertStatement":
        if (stmt.kind === "value" && stmt.expression) {
          this.inferExprType(stmt.expression);
        } else if (stmt.kind === "semantic" && stmt.subject && stmt.criteria) {
          this.inferExprType(stmt.subject);
          this.inferExprType(stmt.criteria);
        }
        break;
    }
  }

  private checkToolDeclaration(decl: AST.ToolDeclarationNode): void {
    const childScope = this.scope.child();
    const prevScope = this.scope;
    this.scope = childScope;

    for (const param of decl.params) {
      const paramType = this.resolveTypeExpr(param.typeExpr);
      this.scope.define(param.name, paramType);
    }

    for (const stmt of decl.body) {
      this.checkStatement(stmt);
    }

    this.scope = prevScope;

    // Register tool as a function in parent scope
    const paramTypes = decl.params.map(p => this.resolveTypeExpr(p.typeExpr));
    const returnType = this.resolveTypeExpr(decl.returnType);
    this.scope.define(decl.name, {
      kind: "function",
      params: paramTypes,
      returnType,
    });
  }

  private checkFunctionDeclaration(decl: AST.FunctionDeclarationNode): void {
    const childScope = this.scope.child();
    const prevScope = this.scope;
    this.scope = childScope;

    for (const param of decl.params) {
      const paramType = this.resolveTypeExpr(param.typeExpr);
      this.scope.define(param.name, paramType);
    }

    for (const stmt of decl.body) {
      this.checkStatement(stmt);
    }

    this.scope = prevScope;

    // Register function in parent scope
    const paramTypes = decl.params.map(p => this.resolveTypeExpr(p.typeExpr));
    const returnType = decl.returnType ? this.resolveTypeExpr(decl.returnType) : makeUnknown();
    this.scope.define(decl.name, {
      kind: "function",
      params: paramTypes,
      returnType,
    });
  }

  private checkLetDeclaration(decl: AST.LetDeclarationNode): void {
    let valueType = this.inferExprType(decl.value);

    // If explicitly marked uncertain, wrap the type
    if (decl.isUncertain) {
      valueType = makeUncertain(valueType);
    }

    // Think and infer expressions return uncertain types unless they already are Confident
    if (
      (decl.value.type === "ThinkExpression" || decl.value.type === "InferExpression") &&
      !decl.isUncertain
    ) {
      // The result is still uncertain until unwrapped
      if (valueType.kind !== "confident") {
        valueType = makeUncertain(valueType);
      }
    }

    this.scope.define(decl.name, valueType);
  }

  private checkTryCatch(node: AST.TryCatchNode): void {
    const childScope = this.scope.child();
    const prevScope = this.scope;
    this.scope = childScope;

    for (const stmt of node.tryBody) {
      this.checkStatement(stmt);
    }

    this.scope = prevScope;

    for (const clause of node.catchClauses) {
      const catchScope = this.scope.child();
      const prev = this.scope;
      this.scope = catchScope;

      this.scope.define(clause.binding, makeUnknown());

      for (const stmt of clause.body) {
        this.checkStatement(stmt);
      }

      this.scope = prev;
    }
  }

  private checkIfElse(node: AST.IfElseNode): void {
    this.inferExprType(node.condition);

    const thenScope = this.scope.child();
    const prevScope = this.scope;
    this.scope = thenScope;
    for (const stmt of node.thenBody) {
      this.checkStatement(stmt);
    }
    this.scope = prevScope;

    if (node.elseBody) {
      const elseScope = this.scope.child();
      this.scope = elseScope;
      for (const stmt of node.elseBody) {
        this.checkStatement(stmt);
      }
      this.scope = prevScope;
    }
  }

  private inferExprType(expr: AST.ExpressionNode): TlType {
    switch (expr.type) {
      case "ThinkExpression":
        return this.resolveTypeExpr(expr.typeArgument);

      case "InferExpression":
        return this.resolveTypeExpr(expr.typeArgument);

      case "ReasonBlock":
        return this.resolveTypeExpr(expr.typeArgument);

      case "AgentExpression":
        return this.resolveTypeExpr(expr.typeArgument);

      case "BatchExpression":
        return { kind: "array", elementType: this.resolveTypeExpr(expr.typeArgument) };

      case "MapThinkExpression":
        return { kind: "array", elementType: this.resolveTypeExpr(expr.typeArgument) };

      case "ReduceThinkExpression":
        return this.resolveTypeExpr(expr.typeArgument);

      case "PipelineExpression": {
        // Type of a pipeline is the type of the last stage
        let lastType: TlType = makeUnknown();
        for (const stage of expr.stages) {
          lastType = this.inferExprType(stage);
        }
        return lastType;
      }

      case "MatchExpression": {
        this.inferExprType(expr.subject);
        this.checkMatchExhaustiveness(expr);
        // Type is the union of arm body types (simplified: use unknown)
        return makeUnknown();
      }

      case "FunctionCallExpression": {
        const calleeType = this.inferExprType(expr.callee);
        // If callee is .unwrap(), .expect(), or .or() on uncertain, resolve
        if (expr.callee.type === "MemberExpression") {
          const methodName = expr.callee.property;
          if (methodName === "unwrap" || methodName === "expect" || methodName === "or") {
            const objType = this.inferExprType(expr.callee.object);
            if (objType.kind === "uncertain") {
              return objType.innerType;
            }
            if (objType.kind === "confident") {
              return objType.innerType;
            }
          }
        }
        if (calleeType.kind === "function") {
          return calleeType.returnType;
        }
        return makeUnknown();
      }

      case "MemberExpression": {
        const objType = this.inferExprType(expr.object);

        // Check for uncertain access
        if (objType.kind === "uncertain") {
          const propName = expr.property;
          // Allow .unwrap(), .expect(), .or(), .confidence, .value (these are meta operations)
          const allowedProps = ["unwrap", "expect", "or", "confidence", "isConfident", "map", "value", "reasoning"];
          if (!allowedProps.includes(propName)) {
            this.errors.push(new UncertainAccessError(
              this.getExprName(expr.object),
              expr.location
            ));
          }
        }

        // Resolve object field type
        if (objType.kind === "object") {
          const fieldType = objType.fields.get(expr.property);
          if (fieldType) return fieldType;
        }

        if (objType.kind === "confident") {
          if (expr.property === "value") return objType.innerType;
          if (expr.property === "confidence") return makeFloat();
          if (expr.property === "reasoning") return makeString();
        }

        return makeUnknown();
      }

      case "IdentifierExpression": {
        const varType = this.scope.lookup(expr.name);
        if (varType) return varType;
        // Don't error on built-in identifiers
        return makeUnknown();
      }

      case "StringLiteral":
        return makeString();

      case "NumberLiteral":
        return Number.isInteger(expr.value) ? makeInt() : makeFloat();

      case "BooleanLiteral":
        return makeBool();

      case "NullLiteral":
        return makeNull();

      case "ArrayLiteral": {
        if (expr.elements.length === 0) return { kind: "array", elementType: makeUnknown() };
        const elemType = this.inferExprType(expr.elements[0]);
        return { kind: "array", elementType: elemType };
      }

      case "ObjectLiteral": {
        const fields = new Map<string, TlType>();
        for (const prop of expr.properties) {
          fields.set(prop.key, this.inferExprType(prop.value));
        }
        return { kind: "object", name: "anonymous", fields };
      }

      case "BinaryExpression": {
        const leftType = this.inferExprType(expr.left);
        const rightType = this.inferExprType(expr.right);
        if ([">=", "<=", ">", "<", "==", "!=", "&&", "||"].includes(expr.operator)) {
          return makeBool();
        }
        return leftType; // Arithmetic preserves left type
      }

      case "UnaryExpression":
        if (expr.operator === "!") return makeBool();
        return this.inferExprType(expr.operand);

      case "RangeExpression":
        return makeUnknown(); // Ranges are used in guards

      default:
        return makeUnknown();
    }
  }

  private checkMatchExhaustiveness(expr: AST.MatchExpressionNode): void {
    const hasWildcard = expr.arms.some(arm => arm.pattern.type === "WildcardPattern");
    if (!hasWildcard) {
      this.warnings.push(new NonExhaustiveMatchWarning(expr.location));
    }
  }

  private resolveTypeExpr(typeExpr: AST.TypeExpressionNode): TlType {
    switch (typeExpr.type) {
      case "PrimitiveType":
        switch (typeExpr.name) {
          case "string": return makeString();
          case "int": return makeInt();
          case "float": return makeFloat();
          case "bool": return makeBool();
          case "null": return makeNull();
        }
        break;

      case "NamedType": {
        const decl = this.typeDecls.get(typeExpr.name);
        if (decl) {
          const fields = new Map<string, TlType>();
          for (const field of decl.fields) {
            fields.set(field.name, this.resolveTypeExpr(field.typeExpr));
          }
          return { kind: "object", name: typeExpr.name, fields };
        }
        return makeUnknown();
      }

      case "ArrayType":
        return { kind: "array", elementType: this.resolveTypeExpr(typeExpr.elementType) };

      case "OptionalType":
        return { kind: "optional", innerType: this.resolveTypeExpr(typeExpr.innerType) };

      case "UnionType":
        return { kind: "union", members: typeExpr.members.map(m => this.resolveTypeExpr(m)) };

      case "ConfidentType":
        return makeConfident(this.resolveTypeExpr(typeExpr.innerType));
    }

    return makeUnknown();
  }

  private getExprName(expr: AST.ExpressionNode): string {
    if (expr.type === "IdentifierExpression") return expr.name;
    if (expr.type === "MemberExpression") {
      return `${this.getExprName(expr.object)}.${expr.property}`;
    }
    return "<expression>";
  }
}
