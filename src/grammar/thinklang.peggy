{{
// ThinkLang PEG Grammar — Phase 1, Phase 2 & Phase 4 (Agentic)
}}

{
  function loc() {
    return location();
  }

  function buildBinaryExpr(head, tail) {
    return tail.reduce((left, [, op, , right]) => ({
      type: "BinaryExpression",
      operator: op,
      left,
      right,
      location: loc()
    }), head);
  }
}

// ─── Program ──────────────────────────────────────────────

Program
  = __ imports:ImportList __ body:StatementList __ {
    return { type: "Program", imports, body, location: loc() };
  }

// ─── Imports ──────────────────────────────────────────────

ImportList
  = head:ImportDeclaration tail:(__ ImportDeclaration)* {
    return [head, ...tail.map(t => t[1])];
  }
  / "" { return []; }

ImportDeclaration
  = "import" _ "{" _ names:ImportNameList _ "}" _ "from" _ path:StringLiteralValue {
    return { type: "ImportDeclaration", names, path, location: loc() };
  }

ImportNameList
  = head:Identifier tail:(_ "," _ Identifier)* {
    return [head, ...tail.map(t => t[3])];
  }

StatementList
  = head:Statement tail:(__ Statement)* {
    return [head, ...tail.map(t => t[1])];
  }
  / "" { return []; }

// ─── Statements ───────────────────────────────────────────

Statement
  = TypeDeclaration
  / ToolDeclaration
  / FunctionDeclaration
  / LetDeclaration
  / PrintStatement
  / TryCatch
  / IfElse
  / TestBlock
  / AssertStatement
  / ExpressionStatement

TypeDeclaration
  = "type" _ name:Identifier _ "{" __ fields:TypeFieldList __ "}" {
    return { type: "TypeDeclaration", name, fields, location: loc() };
  }

TypeFieldList
  = head:TypeField tail:(__ TypeField)* {
    return [head, ...tail.map(t => t[1])];
  }
  / "" { return []; }

TypeField
  = annotations:AnnotationList name:Identifier _ ":" _ typeExpr:TypeExpression {
    return { type: "TypeField", name, typeExpr, annotations, location: loc() };
  }

AnnotationList
  = annotations:(Annotation __)* {
    return annotations.map(a => a[0]);
  }

Annotation
  = "@" name:Identifier "(" value:AnnotationValue ")" {
    return { type: "Annotation", name, value, location: loc() };
  }

AnnotationValue
  = v:StringLiteralValue { return v; }
  / n:Number { return n; }

FunctionDeclaration
  = "fn" _ name:Identifier _ "(" _ params:ParamList _ ")" _ returnType:(":" _ TypeExpression)? _ "{" __ body:StatementList __ "}" {
    return {
      type: "FunctionDeclaration",
      name,
      params,
      returnType: returnType ? returnType[2] : null,
      body,
      location: loc()
    };
  }

// ─── Phase 4: Tool Declaration ──────────────────────────

ToolDeclaration
  = "tool" _ name:Identifier _ "(" _ params:ParamList _ ")" _ ":" _ returnType:TypeExpression _ desc:("@" _ "description" _ "(" _ StringLiteralValue _ ")")? _ "{" __ body:StatementList __ "}" {
    return {
      type: "ToolDeclaration",
      name,
      params,
      returnType,
      description: desc ? desc[6] : null,
      body,
      location: loc()
    };
  }

ParamList
  = head:Param tail:(_ "," _ Param)* {
    return [head, ...tail.map(t => t[3])];
  }
  / "" { return []; }

Param
  = name:Identifier _ ":" _ typeExpr:TypeExpression {
    return { type: "FunctionParam", name, typeExpr, location: loc() };
  }

LetDeclaration
  = "let" _ isUncertain:("uncertain" _)? name:Identifier typeAnnotation:(_ ":" _ TypeExpression)? _ "=" _ value:Expression {
    return {
      type: "LetDeclaration",
      name,
      typeAnnotation: typeAnnotation ? typeAnnotation[3] : null,
      value,
      isUncertain: !!isUncertain,
      location: loc()
    };
  }

PrintStatement
  = "print" _ expression:Expression {
    return { type: "PrintStatement", expression, location: loc() };
  }

// ─── Phase 3: Test Block ─────────────────────────────────

TestBlock
  = "test" _ mode:TestMode? _ desc:StringLiteralValue __ "{" __ body:StatementList __ "}" {
    return {
      type: "TestBlock",
      description: desc,
      mode: mode || null,
      body,
      location: loc()
    };
  }

TestMode
  = "mode" _ ":" _ name:Identifier _ "(" _ arg:StringLiteralValue _ ")" _ {
    return { type: "TestMode", modeName: name, argument: arg, location: loc() };
  }

// ─── Phase 3: Assert Statement ───────────────────────────

AssertStatement
  = "assert" _ "." _ "semantic" _ "(" _ subject:Expression _ "," _ criteria:Expression _ ")" {
    return {
      type: "AssertStatement",
      kind: "semantic",
      subject,
      criteria,
      location: loc()
    };
  }
  / "assert" _ expression:Expression {
    return {
      type: "AssertStatement",
      kind: "value",
      expression,
      location: loc()
    };
  }

ExpressionStatement
  = expression:Expression {
    return { type: "ExpressionStatement", expression, location: loc() };
  }

// ─── Phase 2: Try/Catch ──────────────────────────────────

TryCatch
  = "try" __ "{" __ tryBody:StatementList __ "}" catchClauses:(__ CatchClause)+ {
    return {
      type: "TryCatch",
      tryBody,
      catchClauses: catchClauses.map(c => c[1]),
      location: loc()
    };
  }

CatchClause
  = "catch" _ errorType:Identifier _ "(" _ binding:Identifier _ ")" _ "{" __ body:StatementList __ "}" {
    return {
      type: "CatchClause",
      errorType,
      binding,
      body,
      location: loc()
    };
  }

// ─── Phase 2: If/Else ────────────────────────────────────

IfElse
  = "if" _ condition:Expression __ "{" __ thenBody:StatementList __ "}" elseClause:(__ "else" __ "{" __ StatementList __ "}")? {
    return {
      type: "IfElse",
      condition,
      thenBody,
      elseBody: elseClause ? elseClause[5] : null,
      location: loc()
    };
  }

// ─── Type Expressions ─────────────────────────────────────

TypeExpression
  = UnionType

UnionType
  = head:OptionalType tail:(_ "|" _ OptionalType)+ {
    return { type: "UnionType", members: [head, ...tail.map(t => t[3])], location: loc() };
  }
  / OptionalType

OptionalType
  = inner:ArrayType "?" {
    return { type: "OptionalType", innerType: inner, location: loc() };
  }
  / ArrayType

ArrayType
  = inner:BaseType "[]" {
    return { type: "ArrayType", elementType: inner, location: loc() };
  }
  / BaseType

BaseType
  = ConfidentType
  / PrimitiveType
  / NamedType
  / "(" _ t:TypeExpression _ ")" { return t; }

ConfidentType
  = "Confident" "<" _ inner:TypeExpression _ ">" {
    return { type: "ConfidentType", innerType: inner, location: loc() };
  }

PrimitiveType
  = name:("string" / "int" / "float" / "bool" / "null") !IdentContinue {
    return { type: "PrimitiveType", name, location: loc() };
  }

NamedType
  = name:Identifier {
    return { type: "NamedType", name, location: loc() };
  }

// ─── Expressions ──────────────────────────────────────────

Expression
  = PipelineExpression

PipelineExpression
  = head:LogicalOrExpression tail:(__ "|>" __ LogicalOrExpression)+ {
    return { type: "PipelineExpression", stages: [head, ...tail.map(t => t[3])], location: loc() };
  }
  / LogicalOrExpression

// ─── Operators (Phase 2) ─────────────────────────────────

LogicalOrExpression
  = head:LogicalAndExpression tail:(_ "||" _ LogicalAndExpression)* {
    return buildBinaryExpr(head, tail);
  }

LogicalAndExpression
  = head:EqualityExpression tail:(_ "&&" _ EqualityExpression)* {
    return buildBinaryExpr(head, tail);
  }

EqualityExpression
  = head:ComparisonExpression tail:(_ ("==" / "!=") _ ComparisonExpression)* {
    return buildBinaryExpr(head, tail);
  }

ComparisonExpression
  = head:AdditiveExpression tail:(_ (">=" / "<=" / ">" / "<") _ AdditiveExpression)* {
    return buildBinaryExpr(head, tail);
  }

AdditiveExpression
  = head:MultiplicativeExpression tail:(_ ("+" / "-") _ MultiplicativeExpression)* {
    return buildBinaryExpr(head, tail);
  }

MultiplicativeExpression
  = head:UnaryExpression tail:(_ ("*" / "/") _ UnaryExpression)* {
    return buildBinaryExpr(head, tail);
  }

UnaryExpression
  = "!" _ operand:UnaryExpression {
    return { type: "UnaryExpression", operator: "!", operand, location: loc() };
  }
  / "-" _ operand:UnaryExpression {
    return { type: "UnaryExpression", operator: "-", operand, location: loc() };
  }
  / RangeExpression

RangeExpression
  = start:PostfixExpression ".." end:PostfixExpression {
    return { type: "RangeExpression", start, end, location: loc() };
  }
  / PostfixExpression

PostfixExpression
  = head:PrimaryExpression tail:PostfixOp* {
    return tail.reduce((expr, op) => {
      if (op.type === "member") {
        return { type: "MemberExpression", object: expr, property: op.name, location: loc() };
      } else if (op.type === "call") {
        return { type: "FunctionCallExpression", callee: expr, args: op.args, location: loc() };
      }
      return expr;
    }, head);
  }

PostfixOp
  = "." name:Identifier { return { type: "member", name }; }
  / "(" _ args:ArgList _ ")" { return { type: "call", args }; }

ArgList
  = head:Expression tail:(_ "," _ Expression)* {
    return [head, ...tail.map(t => t[3])];
  }
  / "" { return []; }

// ─── Primary Expressions ─────────────────────────────────

PrimaryExpression
  = ThinkExpression
  / InferExpression
  / ReasonBlock
  / AgentExpression
  / BatchExpression
  / MapThinkExpression
  / ReduceThinkExpression
  / MatchExpression
  / ObjectLiteral
  / ArrayLiteral
  / BooleanLiteral
  / NullLiteral
  / NumberLiteral
  / StringLiteralExpr
  / IdentifierExpression
  / "(" _ expr:Expression _ ")" { return expr; }

// ─── Think Expression ─────────────────────────────────────

ThinkExpression
  = "think" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ prompt:Expression _ ")" withCtx:(__ WithClause)? withoutCtx:(__ WithoutClause)? guard:(__ GuardClause)? onFail:(__ OnFailClause)? {
    return {
      type: "ThinkExpression",
      typeArgument: typeArg,
      prompt,
      withContext: withCtx ? withCtx[1] : null,
      withoutContext: withoutCtx ? withoutCtx[1] : null,
      guard: guard ? guard[1] : null,
      onFail: onFail ? onFail[1] : null,
      location: loc()
    };
  }

// ─── Infer Expression ─────────────────────────────────────

InferExpression
  = "infer" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ value:Expression hint:(_ "," _ Expression)? _ ")" withCtx:(__ WithClause)? withoutCtx:(__ WithoutClause)? guard:(__ GuardClause)? onFail:(__ OnFailClause)? {
    return {
      type: "InferExpression",
      typeArgument: typeArg,
      value,
      hint: hint ? hint[3] : null,
      withContext: withCtx ? withCtx[1] : null,
      withoutContext: withoutCtx ? withoutCtx[1] : null,
      guard: guard ? guard[1] : null,
      onFail: onFail ? onFail[1] : null,
      location: loc()
    };
  }

// ─── Phase 4: Agent Expression ───────────────────────────

AgentExpression
  = "agent" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ prompt:Expression _ ")" withTools:(__ WithToolsClause)? withCtx:(__ WithClause)? maxTurns:(__ MaxTurnsClause)? guard:(__ GuardClause)? onFail:(__ OnFailClause)? {
    return {
      type: "AgentExpression",
      typeArgument: typeArg,
      prompt,
      tools: withTools ? withTools[1] : [],
      withContext: withCtx ? withCtx[1] : null,
      maxTurns: maxTurns ? maxTurns[1] : null,
      guard: guard ? guard[1] : null,
      onFail: onFail ? onFail[1] : null,
      location: loc()
    };
  }

// ─── Phase 5: Big Data Expressions ──────────────────────

BatchExpression
  = "batch" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ items:Expression _ "," _ processor:Expression _ ")" concurrency:(__ ConcurrencyClause)? costBudget:(__ CostBudgetClause)? onError:(__ OnErrorClause)? {
    return {
      type: "BatchExpression",
      typeArgument: typeArg,
      items,
      processor,
      concurrency: concurrency ? concurrency[1] : null,
      costBudget: costBudget ? costBudget[1] : null,
      onError: onError ? onError[1] : null,
      location: loc()
    };
  }

MapThinkExpression
  = "map_think" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ items:Expression _ "," _ promptTemplate:Expression _ ")" concurrency:(__ ConcurrencyClause)? costBudget:(__ CostBudgetClause)? withCtx:(__ WithClause)? {
    return {
      type: "MapThinkExpression",
      typeArgument: typeArg,
      items,
      promptTemplate,
      concurrency: concurrency ? concurrency[1] : null,
      costBudget: costBudget ? costBudget[1] : null,
      withContext: withCtx ? withCtx[1] : null,
      location: loc()
    };
  }

ReduceThinkExpression
  = "reduce_think" _ "<" _ typeArg:TypeExpression _ ">" _ "(" _ items:Expression _ "," _ prompt:Expression _ ")" batchSize:(__ BatchSizeClause)? withCtx:(__ WithClause)? {
    return {
      type: "ReduceThinkExpression",
      typeArgument: typeArg,
      items,
      prompt,
      batchSize: batchSize ? batchSize[1] : null,
      withContext: withCtx ? withCtx[1] : null,
      location: loc()
    };
  }

ConcurrencyClause
  = "concurrency" _ ":" _ count:Integer {
    return count;
  }

CostBudgetClause
  = "cost_budget" _ ":" _ amount:Number {
    return amount;
  }

OnErrorClause
  = "on_error" _ ":" _ strategy:("fail_fast" / "continue") {
    return strategy === "fail_fast" ? "fail-fast" : "continue";
  }

BatchSizeClause
  = "batch_size" _ ":" _ size:Integer {
    return size;
  }

WithToolsClause
  = "with" _ "tools" _ ":" _ head:Identifier tail:(_ "," _ Identifier)* {
    return [head, ...tail.map(t => t[3])];
  }

MaxTurnsClause
  = "max" _ "turns" _ ":" _ count:Integer {
    return count;
  }

// ─── With / Without Context ───────────────────────────────

WithClause
  = "with" _ "context" _ ":" _ ctx:ContextExpression {
    return ctx;
  }

WithoutClause
  = "without" _ "context" _ ":" _ ctx:ContextExpression {
    return ctx;
  }

ContextExpression
  = "{" __ entries:ContextEntryList __ "}" {
    return { type: "ContextBlock", entries, location: loc() };
  }
  / PostfixExpression

ContextEntryList
  = head:ContextEntry tail:(_ "," __ ContextEntry)* (_ ",")? {
    return [head, ...tail.map(t => t[3])];
  }

ContextEntry
  = head:Identifier tail:("." Identifier)* {
    return tail.reduce((obj, [, prop]) => ({
      type: "MemberExpression",
      object: obj,
      property: prop,
      location: loc()
    }), { type: "IdentifierExpression", name: head, location: loc() });
  }

// ─── Phase 2: Reason Block ───────────────────────────────

ReasonBlock
  = "reason" _ "<" _ typeArg:TypeExpression _ ">" _ "{" __ goal:GoalClause __ steps:StepsClause withCtx:(__ WithClause)? withoutCtx:(__ WithoutClause)? guard:(__ GuardClause)? onFail:(__ OnFailClause)? __ "}" {
    return {
      type: "ReasonBlock",
      typeArgument: typeArg,
      goal,
      steps,
      withContext: withCtx ? withCtx[1] : null,
      withoutContext: withoutCtx ? withoutCtx[1] : null,
      guard: guard ? guard[1] : null,
      onFail: onFail ? onFail[1] : null,
      location: loc()
    };
  }

GoalClause
  = "goal" _ ":" _ value:StringLiteralValue {
    return value;
  }

StepsClause
  = "steps" _ ":" __ steps:StepList {
    return steps;
  }

StepList
  = head:NumberedStep tail:(__ NumberedStep)* {
    return [head, ...tail.map(t => t[1])];
  }

NumberedStep
  = num:Integer "." _ desc:StringLiteralValue {
    return { type: "ReasonStep", number: num, description: desc, location: loc() };
  }

// ─── Phase 2: Guard / OnFail ──────────────────────────────

GuardClause
  = "guard" _ "{" __ rules:GuardRuleList __ "}" {
    return { type: "GuardClause", rules, location: loc() };
  }

GuardRuleList
  = head:GuardRule tail:(__ GuardRule)* {
    return [head, ...tail.map(t => t[1])];
  }

GuardRule
  = name:Identifier _ ":" _ constraint:Expression rangeEnd:(_ ".." _ Expression)? {
    return {
      type: "GuardRule",
      name,
      constraint,
      rangeEnd: rangeEnd ? rangeEnd[3] : null,
      location: loc()
    };
  }

OnFailClause
  = "on_fail" _ ":" _ "retry" _ "(" _ count:Integer _ ")" fallback:(_ "then" _ "fallback" _ "(" _ Expression _ ")")? {
    return {
      type: "OnFailClause",
      retryCount: count,
      fallback: fallback ? fallback[7] : null,
      location: loc()
    };
  }

// ─── Phase 2: Match Expression ────────────────────────────

MatchExpression
  = "match" _ subject:PostfixExpression __ "{" __ arms:MatchArmList __ "}" {
    return { type: "MatchExpression", subject, arms, location: loc() };
  }

MatchArmList
  = head:MatchArm tail:(__ MatchArm)* {
    return [head, ...tail.map(t => t[1])];
  }

MatchArm
  = pattern:Pattern _ "=>" _ body:Expression {
    return { type: "MatchArm", pattern, body, location: loc() };
  }

Pattern
  = ObjectPattern
  / WildcardPattern
  / LiteralPattern

ObjectPattern
  = "{" __ fields:PatternFieldList __ "}" {
    return { type: "ObjectPattern", fields, location: loc() };
  }

PatternFieldList
  = head:PatternField tail:(_ "," __ PatternField)* (_ ",")? {
    return [head, ...tail.map(t => t[3])];
  }

PatternField
  = name:Identifier _ ":" _ constraint:PatternConstraint {
    return { type: "PatternField", name, constraint, location: loc() };
  }

PatternConstraint
  = op:(">=" / "<=" / "==" / "!=") _ value:Expression {
    return { type: "ComparisonConstraint", operator: op, value, location: loc() };
  }
  / value:Expression {
    return { type: "LiteralConstraint", value, location: loc() };
  }

WildcardPattern
  = "_" !IdentContinue {
    return { type: "WildcardPattern", location: loc() };
  }

LiteralPattern
  = value:(StringLiteralExpr / NumberLiteral / BooleanLiteral / NullLiteral) {
    return { type: "LiteralPattern", value, location: loc() };
  }

// ─── Literals ─────────────────────────────────────────────

StringLiteralExpr
  = value:StringLiteralValue {
    return { type: "StringLiteral", value, location: loc() };
  }

StringLiteralValue
  = '"' chars:DoubleStringChar* '"' { return chars.join(""); }
  / "'" chars:SingleStringChar* "'" { return chars.join(""); }

DoubleStringChar
  = '\\' c:. { return c === 'n' ? '\n' : c === 't' ? '\t' : c === '\\' ? '\\' : c === '"' ? '"' : c; }
  / [^"\\]

SingleStringChar
  = '\\' c:. { return c === 'n' ? '\n' : c === 't' ? '\t' : c === '\\' ? '\\' : c === "'" ? "'" : c; }
  / [^'\\]

NumberLiteral
  = digits:$([0-9]+ "." [0-9]+) {
    return { type: "NumberLiteral", value: parseFloat(digits), location: loc() };
  }
  / digits:$[0-9]+ {
    return { type: "NumberLiteral", value: parseInt(digits, 10), location: loc() };
  }

Number
  = digits:$([0-9]+ "." [0-9]+) { return parseFloat(digits); }
  / digits:$[0-9]+ { return parseInt(digits, 10); }

Integer
  = digits:$[0-9]+ { return parseInt(digits, 10); }

BooleanLiteral
  = "true" !IdentContinue { return { type: "BooleanLiteral", value: true, location: loc() }; }
  / "false" !IdentContinue { return { type: "BooleanLiteral", value: false, location: loc() }; }

NullLiteral
  = "null" !IdentContinue { return { type: "NullLiteral", location: loc() }; }

ArrayLiteral
  = "[" __ elements:ArrayElements __ "]" {
    return { type: "ArrayLiteral", elements, location: loc() };
  }

ArrayElements
  = head:Expression tail:(_ "," __ Expression)* {
    return [head, ...tail.map(t => t[3])];
  }
  / "" { return []; }

ObjectLiteral
  = "{" __ props:ObjectProperties __ "}" {
    return { type: "ObjectLiteral", properties: props, location: loc() };
  }

ObjectProperties
  = head:ObjectProperty tail:(_ "," __ ObjectProperty)* (_ ",")? {
    return [head, ...tail.map(t => t[3])];
  }
  / "" { return []; }

ObjectProperty
  = key:Identifier _ ":" _ value:Expression {
    return { type: "ObjectProperty", key, value, location: loc() };
  }

// ─── Identifiers ──────────────────────────────────────────

IdentifierExpression
  = name:Identifier {
    return { type: "IdentifierExpression", name, location: loc() };
  }

Identifier "identifier"
  = !ReservedWord name:$([a-zA-Z_] IdentContinue*) { return name; }

IdentContinue
  = [a-zA-Z0-9_]

ReservedWord
  = ("type" / "fn" / "let" / "print" / "think" / "infer"
    / "match" / "try" / "catch" / "if" / "else" / "true" / "false" / "null"
    / "Confident" / "string" / "int" / "float" / "bool"
    / "test" / "assert" / "import" / "from"
    / "tool" / "agent"
    / "batch" / "map_think" / "reduce_think") !IdentContinue

// ─── Whitespace & Comments ────────────────────────────────

__ "whitespace"
  = (WhitespaceChar / LineTerminator / Comment)*

_ "single-line whitespace"
  = (WhitespaceChar / Comment)*

WhitespaceChar
  = [ \t]

LineTerminator
  = [\n\r]

Comment
  = "//" [^\n\r]*
  / "/*" (!"*/" .)* "*/"
