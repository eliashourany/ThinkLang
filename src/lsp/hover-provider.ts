import { Hover, Position } from "vscode-languageserver";
import type { DocumentState } from "./document-manager.js";
import type * as AST from "../ast/nodes.js";
import { typeToString } from "../checker/types.js";
import { resolveTypeExpression } from "../checker/checker.js";
import { positionInLocation } from "./utils.js";

export function provideHover(state: DocumentState, position: Position): Hover | null {
  if (!state.ast) return null;

  const node = findNodeAtPosition(state.ast, position);
  if (!node) return null;

  if (node.type === "IdentifierExpression") {
    // Look up variable binding
    const binding = state.scope.lookup(node.name);
    if (binding) {
      return {
        contents: {
          kind: "markdown",
          value: `\`\`\`thinklang\nlet ${node.name}: ${typeToString(binding.type)}\n\`\`\``,
        },
      };
    }

    // Check if it's a type name
    const typeDecl = state.typeDecls.get(node.name);
    if (typeDecl) {
      const fields = typeDecl.fields.map(f => `  ${f.name}: ${typeExprToString(f.typeExpr)}`).join("\n");
      return {
        contents: {
          kind: "markdown",
          value: `\`\`\`thinklang\ntype ${node.name} {\n${fields}\n}\n\`\`\``,
        },
      };
    }
  }

  if (node.type === "NamedType") {
    const typeDecl = state.typeDecls.get(node.name);
    if (typeDecl) {
      const fields = typeDecl.fields.map(f => `  ${f.name}: ${typeExprToString(f.typeExpr)}`).join("\n");
      return {
        contents: {
          kind: "markdown",
          value: `\`\`\`thinklang\ntype ${node.name} {\n${fields}\n}\n\`\`\``,
        },
      };
    }
  }

  if (node.type === "LetDeclaration") {
    const binding = state.scope.lookup(node.name);
    if (binding) {
      return {
        contents: {
          kind: "markdown",
          value: `\`\`\`thinklang\nlet ${node.name}: ${typeToString(binding.type)}\n\`\`\``,
        },
      };
    }
  }

  return null;
}

function typeExprToString(typeExpr: AST.TypeExpressionNode): string {
  switch (typeExpr.type) {
    case "PrimitiveType": return typeExpr.name;
    case "NamedType": return typeExpr.name;
    case "ArrayType": return `${typeExprToString(typeExpr.elementType)}[]`;
    case "OptionalType": return `${typeExprToString(typeExpr.innerType)}?`;
    case "UnionType": return typeExpr.members.map(typeExprToString).join(" | ");
    case "ConfidentType": return `Confident<${typeExprToString(typeExpr.innerType)}>`;
    default: return "unknown";
  }
}

type AnyNode = AST.StatementNode | AST.ExpressionNode | AST.TypeExpressionNode;

function findNodeAtPosition(program: AST.ProgramNode, position: Position): AnyNode | null {
  for (const stmt of program.body) {
    const found = findInStatement(stmt, position);
    if (found) return found;
  }
  return null;
}

function findInStatement(stmt: AST.StatementNode, pos: Position): AnyNode | null {
  if (!positionInLocation(pos, stmt.location)) return null;

  switch (stmt.type) {
    case "LetDeclaration": {
      const inExpr = findInExpression(stmt.value, pos);
      if (inExpr) return inExpr;
      return stmt;
    }
    case "PrintStatement":
      return findInExpression(stmt.expression, pos) ?? null;
    case "ExpressionStatement":
      return findInExpression(stmt.expression, pos) ?? null;
    case "FunctionDeclaration": {
      for (const bodyStmt of stmt.body) {
        const found = findInStatement(bodyStmt, pos);
        if (found) return found;
      }
      return stmt as any;
    }
    case "TryCatch": {
      for (const bodyStmt of stmt.tryBody) {
        const found = findInStatement(bodyStmt, pos);
        if (found) return found;
      }
      for (const clause of stmt.catchClauses) {
        for (const bodyStmt of clause.body) {
          const found = findInStatement(bodyStmt, pos);
          if (found) return found;
        }
      }
      return null;
    }
    case "IfElse": {
      const condResult = findInExpression(stmt.condition, pos);
      if (condResult) return condResult;
      for (const bodyStmt of stmt.thenBody) {
        const found = findInStatement(bodyStmt, pos);
        if (found) return found;
      }
      if (stmt.elseBody) {
        for (const bodyStmt of stmt.elseBody) {
          const found = findInStatement(bodyStmt, pos);
          if (found) return found;
        }
      }
      return null;
    }
    case "TypeDeclaration":
      return stmt as any;
    default:
      return null;
  }
}

function findInExpression(expr: AST.ExpressionNode, pos: Position): AnyNode | null {
  if (!positionInLocation(pos, expr.location)) return null;

  switch (expr.type) {
    case "MemberExpression": {
      const inner = findInExpression(expr.object, pos);
      if (inner) return inner;
      return expr;
    }
    case "FunctionCallExpression": {
      const callee = findInExpression(expr.callee, pos);
      if (callee) return callee;
      for (const arg of expr.args) {
        const found = findInExpression(arg, pos);
        if (found) return found;
      }
      return expr;
    }
    case "PipelineExpression": {
      for (const stage of expr.stages) {
        const found = findInExpression(stage, pos);
        if (found) return found;
      }
      return expr;
    }
    case "BinaryExpression": {
      const left = findInExpression(expr.left, pos);
      if (left) return left;
      const right = findInExpression(expr.right, pos);
      if (right) return right;
      return expr;
    }
    case "UnaryExpression":
      return findInExpression(expr.operand, pos) ?? expr;
    case "ThinkExpression": {
      const typeArg = findInTypeExpr(expr.typeArgument, pos);
      if (typeArg) return typeArg;
      return findInExpression(expr.prompt, pos) ?? expr;
    }
    case "InferExpression": {
      const typeArg = findInTypeExpr(expr.typeArgument, pos);
      if (typeArg) return typeArg;
      return findInExpression(expr.value, pos) ?? expr;
    }
    case "IdentifierExpression":
      return expr;
    default:
      return expr;
  }
}

function findInTypeExpr(typeExpr: AST.TypeExpressionNode, pos: Position): AnyNode | null {
  if (!positionInLocation(pos, typeExpr.location)) return null;
  if (typeExpr.type === "NamedType") return typeExpr;
  if (typeExpr.type === "ConfidentType") return findInTypeExpr(typeExpr.innerType, pos) ?? typeExpr;
  if (typeExpr.type === "ArrayType") return findInTypeExpr(typeExpr.elementType, pos) ?? typeExpr;
  if (typeExpr.type === "OptionalType") return findInTypeExpr(typeExpr.innerType, pos) ?? typeExpr;
  return typeExpr;
}
