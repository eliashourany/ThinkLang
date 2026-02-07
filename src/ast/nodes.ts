// ThinkLang AST Node Definitions — Phase 1 & Phase 2

export interface Location {
  start: { offset: number; line: number; column: number };
  end: { offset: number; line: number; column: number };
}

// ─── Imports ──────────────────────────────────────────────

export interface ImportDeclarationNode {
  type: "ImportDeclaration";
  names: string[];
  path: string;
  location?: Location;
}

// ─── Program ──────────────────────────────────────────────

export interface ProgramNode {
  type: "Program";
  imports: ImportDeclarationNode[];
  body: StatementNode[];
  location?: Location;
}

// ─── Statements ───────────────────────────────────────────

export type StatementNode =
  | TypeDeclarationNode
  | FunctionDeclarationNode
  | LetDeclarationNode
  | PrintStatementNode
  | ExpressionStatementNode
  | TryCatchNode
  | IfElseNode
  | TestBlockNode
  | AssertStatementNode;

export interface TypeDeclarationNode {
  type: "TypeDeclaration";
  name: string;
  fields: TypeFieldNode[];
  location?: Location;
}

export interface TypeFieldNode {
  type: "TypeField";
  name: string;
  typeExpr: TypeExpressionNode;
  annotations: AnnotationNode[];
  location?: Location;
}

export interface AnnotationNode {
  type: "Annotation";
  name: string;
  value: string | number;
  location?: Location;
}

export interface FunctionDeclarationNode {
  type: "FunctionDeclaration";
  name: string;
  params: FunctionParamNode[];
  returnType?: TypeExpressionNode;
  body: StatementNode[];
  location?: Location;
}

export interface FunctionParamNode {
  type: "FunctionParam";
  name: string;
  typeExpr: TypeExpressionNode;
  location?: Location;
}

export interface LetDeclarationNode {
  type: "LetDeclaration";
  name: string;
  typeAnnotation?: TypeExpressionNode;
  value: ExpressionNode;
  isUncertain: boolean;
  location?: Location;
}

export interface PrintStatementNode {
  type: "PrintStatement";
  expression: ExpressionNode;
  location?: Location;
}

export interface ExpressionStatementNode {
  type: "ExpressionStatement";
  expression: ExpressionNode;
  location?: Location;
}

// ─── Phase 2: Try/Catch ──────────────────────────────────

export interface TryCatchNode {
  type: "TryCatch";
  tryBody: StatementNode[];
  catchClauses: CatchClauseNode[];
  location?: Location;
}

export interface CatchClauseNode {
  type: "CatchClause";
  errorType: string;
  binding: string;
  body: StatementNode[];
  location?: Location;
}

// ─── Phase 2: If/Else ────────────────────────────────────

export interface IfElseNode {
  type: "IfElse";
  condition: ExpressionNode;
  thenBody: StatementNode[];
  elseBody?: StatementNode[];
  location?: Location;
}

// ─── Type Expressions ─────────────────────────────────────

export type TypeExpressionNode =
  | PrimitiveTypeNode
  | NamedTypeNode
  | ArrayTypeNode
  | OptionalTypeNode
  | UnionTypeNode
  | ConfidentTypeNode;

export interface PrimitiveTypeNode {
  type: "PrimitiveType";
  name: "string" | "int" | "float" | "bool" | "null";
  location?: Location;
}

export interface NamedTypeNode {
  type: "NamedType";
  name: string;
  location?: Location;
}

export interface ArrayTypeNode {
  type: "ArrayType";
  elementType: TypeExpressionNode;
  location?: Location;
}

export interface OptionalTypeNode {
  type: "OptionalType";
  innerType: TypeExpressionNode;
  location?: Location;
}

export interface UnionTypeNode {
  type: "UnionType";
  members: TypeExpressionNode[];
  location?: Location;
}

export interface ConfidentTypeNode {
  type: "ConfidentType";
  innerType: TypeExpressionNode;
  location?: Location;
}

// ─── Expressions ──────────────────────────────────────────

export type ExpressionNode =
  | ThinkExpressionNode
  | InferExpressionNode
  | ReasonBlockNode
  | PipelineExpressionNode
  | FunctionCallExpressionNode
  | MemberExpressionNode
  | IdentifierExpressionNode
  | StringLiteralNode
  | NumberLiteralNode
  | BooleanLiteralNode
  | NullLiteralNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | MatchExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | RangeExpressionNode;

// ─── Think / Infer ────────────────────────────────────────

export interface ThinkExpressionNode {
  type: "ThinkExpression";
  typeArgument: TypeExpressionNode;
  prompt: ExpressionNode;
  withContext?: ContextExpressionNode;
  withoutContext?: ContextExpressionNode;
  guard?: GuardClauseNode;
  onFail?: OnFailClauseNode;
  location?: Location;
}

export interface InferExpressionNode {
  type: "InferExpression";
  typeArgument: TypeExpressionNode;
  value: ExpressionNode;
  hint?: ExpressionNode;
  withContext?: ContextExpressionNode;
  withoutContext?: ContextExpressionNode;
  guard?: GuardClauseNode;
  onFail?: OnFailClauseNode;
  location?: Location;
}

// ─── Context ──────────────────────────────────────────────

export type ContextExpressionNode =
  | ContextBlockNode
  | IdentifierExpressionNode
  | MemberExpressionNode;

export interface ContextBlockNode {
  type: "ContextBlock";
  entries: ContextEntryNode[];
  location?: Location;
}

export type ContextEntryNode = IdentifierExpressionNode | MemberExpressionNode;

// ─── Phase 2: Reason Block ───────────────────────────────

export interface ReasonBlockNode {
  type: "ReasonBlock";
  typeArgument: TypeExpressionNode;
  goal: string;
  steps: ReasonStepNode[];
  withContext?: ContextExpressionNode;
  withoutContext?: ContextExpressionNode;
  guard?: GuardClauseNode;
  onFail?: OnFailClauseNode;
  location?: Location;
}

export interface ReasonStepNode {
  type: "ReasonStep";
  number: number;
  description: string;
  location?: Location;
}

// ─── Phase 2: Guard / OnFail ──────────────────────────────

export interface GuardClauseNode {
  type: "GuardClause";
  rules: GuardRuleNode[];
  location?: Location;
}

export interface GuardRuleNode {
  type: "GuardRule";
  name: string;
  constraint: ExpressionNode;
  rangeEnd?: ExpressionNode;
  location?: Location;
}

export interface OnFailClauseNode {
  type: "OnFailClause";
  retryCount: number;
  fallback?: ExpressionNode;
  location?: Location;
}

// ─── Phase 2: Match ───────────────────────────────────────

export interface MatchExpressionNode {
  type: "MatchExpression";
  subject: ExpressionNode;
  arms: MatchArmNode[];
  location?: Location;
}

export interface MatchArmNode {
  type: "MatchArm";
  pattern: PatternNode;
  body: ExpressionNode;
  location?: Location;
}

export type PatternNode =
  | ObjectPatternNode
  | LiteralPatternNode
  | WildcardPatternNode;

export interface ObjectPatternNode {
  type: "ObjectPattern";
  fields: PatternFieldNode[];
  location?: Location;
}

export interface PatternFieldNode {
  type: "PatternField";
  name: string;
  constraint: PatternConstraintNode;
  location?: Location;
}

export type PatternConstraintNode =
  | ComparisonConstraintNode
  | LiteralConstraintNode;

export interface ComparisonConstraintNode {
  type: "ComparisonConstraint";
  operator: ">=" | "<=" | "==" | "!=";
  value: ExpressionNode;
  location?: Location;
}

export interface LiteralConstraintNode {
  type: "LiteralConstraint";
  value: ExpressionNode;
  location?: Location;
}

export interface LiteralPatternNode {
  type: "LiteralPattern";
  value: ExpressionNode;
  location?: Location;
}

export interface WildcardPatternNode {
  type: "WildcardPattern";
  location?: Location;
}

// ─── Pipeline ─────────────────────────────────────────────

export interface PipelineExpressionNode {
  type: "PipelineExpression";
  stages: ExpressionNode[];
  location?: Location;
}

// ─── Basic Expressions ────────────────────────────────────

export interface FunctionCallExpressionNode {
  type: "FunctionCallExpression";
  callee: ExpressionNode;
  args: ExpressionNode[];
  location?: Location;
}

export interface MemberExpressionNode {
  type: "MemberExpression";
  object: ExpressionNode;
  property: string;
  location?: Location;
}

export interface IdentifierExpressionNode {
  type: "IdentifierExpression";
  name: string;
  location?: Location;
}

// ─── Literals ─────────────────────────────────────────────

export interface StringLiteralNode {
  type: "StringLiteral";
  value: string;
  location?: Location;
}

export interface NumberLiteralNode {
  type: "NumberLiteral";
  value: number;
  location?: Location;
}

export interface BooleanLiteralNode {
  type: "BooleanLiteral";
  value: boolean;
  location?: Location;
}

export interface NullLiteralNode {
  type: "NullLiteral";
  location?: Location;
}

export interface ArrayLiteralNode {
  type: "ArrayLiteral";
  elements: ExpressionNode[];
  location?: Location;
}

export interface ObjectLiteralNode {
  type: "ObjectLiteral";
  properties: ObjectPropertyNode[];
  location?: Location;
}

export interface ObjectPropertyNode {
  type: "ObjectProperty";
  key: string;
  value: ExpressionNode;
  location?: Location;
}

// ─── Phase 2: Binary / Unary / Range ──────────────────────

export interface BinaryExpressionNode {
  type: "BinaryExpression";
  operator: "+" | "-" | "*" | "/" | ">=" | "<=" | ">" | "<" | "==" | "!=" | "&&" | "||";
  left: ExpressionNode;
  right: ExpressionNode;
  location?: Location;
}

export interface UnaryExpressionNode {
  type: "UnaryExpression";
  operator: "!" | "-";
  operand: ExpressionNode;
  location?: Location;
}

export interface RangeExpressionNode {
  type: "RangeExpression";
  start: ExpressionNode;
  end: ExpressionNode;
  location?: Location;
}

// ─── Phase 3: Test Framework ──────────────────────────────

export interface TestBlockNode {
  type: "TestBlock";
  description: string;
  mode?: TestModeNode;
  body: StatementNode[];
  location?: Location;
}

export interface TestModeNode {
  type: "TestMode";
  modeName: string;
  argument: string;
  location?: Location;
}

export interface AssertStatementNode {
  type: "AssertStatement";
  kind: "value" | "semantic";
  expression?: ExpressionNode;
  subject?: ExpressionNode;
  criteria?: ExpressionNode;
  location?: Location;
}
