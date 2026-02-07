import { Location as LspLocation, Position } from "vscode-languageserver";
import type { DocumentState } from "./document-manager.js";
import type * as AST from "../ast/nodes.js";
import { positionInLocation, astLocationToRange } from "./utils.js";

export function provideDefinition(
  state: DocumentState,
  position: Position,
  uri: string
): LspLocation | null {
  if (!state.ast) return null;

  const name = findIdentifierAtPosition(state.ast, position);
  if (!name) return null;

  // Check variable bindings
  const binding = state.scope.lookup(name);
  if (binding?.location) {
    return { uri, range: astLocationToRange(binding.location) };
  }

  // Check type declarations
  const symbol = state.symbolIndex.get(name);
  if (symbol) {
    return { uri, range: astLocationToRange(symbol.location) };
  }

  return null;
}

function findIdentifierAtPosition(program: AST.ProgramNode, pos: Position): string | null {
  for (const stmt of program.body) {
    const found = findIdInStatement(stmt, pos);
    if (found) return found;
  }
  return null;
}

function findIdInStatement(stmt: AST.StatementNode, pos: Position): string | null {
  if (!positionInLocation(pos, stmt.location)) return null;

  switch (stmt.type) {
    case "LetDeclaration":
      return findIdInExpression(stmt.value, pos);
    case "PrintStatement":
      return findIdInExpression(stmt.expression, pos);
    case "ExpressionStatement":
      return findIdInExpression(stmt.expression, pos);
    case "FunctionDeclaration":
      for (const bodyStmt of stmt.body) {
        const found = findIdInStatement(bodyStmt, pos);
        if (found) return found;
      }
      return null;
    case "TryCatch":
      for (const bodyStmt of stmt.tryBody) {
        const found = findIdInStatement(bodyStmt, pos);
        if (found) return found;
      }
      for (const clause of stmt.catchClauses) {
        for (const bodyStmt of clause.body) {
          const found = findIdInStatement(bodyStmt, pos);
          if (found) return found;
        }
      }
      return null;
    case "IfElse":
      return findIdInExpression(stmt.condition, pos)
        ?? findInStatements(stmt.thenBody, pos)
        ?? (stmt.elseBody ? findInStatements(stmt.elseBody, pos) : null);
    default:
      return null;
  }
}

function findInStatements(stmts: AST.StatementNode[], pos: Position): string | null {
  for (const stmt of stmts) {
    const found = findIdInStatement(stmt, pos);
    if (found) return found;
  }
  return null;
}

function findIdInExpression(expr: AST.ExpressionNode, pos: Position): string | null {
  if (!positionInLocation(pos, expr.location)) return null;

  switch (expr.type) {
    case "IdentifierExpression":
      return expr.name;
    case "MemberExpression":
      return findIdInExpression(expr.object, pos);
    case "FunctionCallExpression":
      return findIdInExpression(expr.callee, pos)
        ?? expr.args.reduce<string | null>((found, arg) => found ?? findIdInExpression(arg, pos), null);
    case "PipelineExpression":
      return expr.stages.reduce<string | null>((found, stage) => found ?? findIdInExpression(stage, pos), null);
    case "BinaryExpression":
      return findIdInExpression(expr.left, pos) ?? findIdInExpression(expr.right, pos);
    case "UnaryExpression":
      return findIdInExpression(expr.operand, pos);
    case "ThinkExpression":
      return findIdInTypeExpr(expr.typeArgument, pos) ?? findIdInExpression(expr.prompt, pos);
    case "InferExpression":
      return findIdInTypeExpr(expr.typeArgument, pos) ?? findIdInExpression(expr.value, pos);
    default:
      return null;
  }
}

function findIdInTypeExpr(typeExpr: AST.TypeExpressionNode, pos: Position): string | null {
  if (!positionInLocation(pos, typeExpr.location)) return null;
  if (typeExpr.type === "NamedType") return typeExpr.name;
  if (typeExpr.type === "ConfidentType") return findIdInTypeExpr(typeExpr.innerType, pos);
  if (typeExpr.type === "ArrayType") return findIdInTypeExpr(typeExpr.elementType, pos);
  if (typeExpr.type === "OptionalType") return findIdInTypeExpr(typeExpr.innerType, pos);
  return null;
}
