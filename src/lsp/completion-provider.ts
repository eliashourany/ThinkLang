import {
  CompletionItem,
  CompletionItemKind,
  Position,
  TextDocument,
} from "vscode-languageserver";
import type { DocumentState } from "./document-manager.js";

const KEYWORDS: CompletionItem[] = [
  { label: "think", kind: CompletionItemKind.Keyword, detail: "AI think expression" },
  { label: "infer", kind: CompletionItemKind.Keyword, detail: "AI infer expression" },
  { label: "reason", kind: CompletionItemKind.Keyword, detail: "AI reason block" },
  { label: "type", kind: CompletionItemKind.Keyword, detail: "Type declaration" },
  { label: "fn", kind: CompletionItemKind.Keyword, detail: "Function declaration" },
  { label: "let", kind: CompletionItemKind.Keyword, detail: "Variable declaration" },
  { label: "print", kind: CompletionItemKind.Keyword, detail: "Print statement" },
  { label: "match", kind: CompletionItemKind.Keyword, detail: "Pattern matching" },
  { label: "try", kind: CompletionItemKind.Keyword, detail: "Try/catch block" },
  { label: "catch", kind: CompletionItemKind.Keyword, detail: "Catch clause" },
  { label: "if", kind: CompletionItemKind.Keyword, detail: "If statement" },
  { label: "else", kind: CompletionItemKind.Keyword, detail: "Else clause" },
  { label: "with", kind: CompletionItemKind.Keyword, detail: "Context clause" },
  { label: "without", kind: CompletionItemKind.Keyword, detail: "Exclude context" },
  { label: "guard", kind: CompletionItemKind.Keyword, detail: "Guard clause" },
  { label: "on_fail", kind: CompletionItemKind.Keyword, detail: "Failure handler" },
  { label: "uncertain", kind: CompletionItemKind.Keyword, detail: "Uncertain type modifier" },
  { label: "test", kind: CompletionItemKind.Keyword, detail: "Test block" },
  { label: "assert", kind: CompletionItemKind.Keyword, detail: "Assertion" },
];

const PRIMITIVE_TYPES: CompletionItem[] = [
  { label: "string", kind: CompletionItemKind.TypeParameter, detail: "String type" },
  { label: "int", kind: CompletionItemKind.TypeParameter, detail: "Integer type" },
  { label: "float", kind: CompletionItemKind.TypeParameter, detail: "Float type" },
  { label: "bool", kind: CompletionItemKind.TypeParameter, detail: "Boolean type" },
  { label: "null", kind: CompletionItemKind.TypeParameter, detail: "Null type" },
  { label: "Confident", kind: CompletionItemKind.TypeParameter, detail: "Confident<T> wrapper" },
];

const UNCERTAIN_METHODS: CompletionItem[] = [
  { label: "unwrap", kind: CompletionItemKind.Method, detail: "Unwrap uncertain value (may throw)" },
  { label: "expect", kind: CompletionItemKind.Method, detail: "Unwrap with threshold (throws if below)" },
  { label: "or", kind: CompletionItemKind.Method, detail: "Unwrap with fallback value" },
  { label: "value", kind: CompletionItemKind.Property, detail: "Raw value" },
  { label: "confidence", kind: CompletionItemKind.Property, detail: "Confidence score (0.0 - 1.0)" },
  { label: "reasoning", kind: CompletionItemKind.Property, detail: "AI reasoning" },
  { label: "isConfident", kind: CompletionItemKind.Method, detail: "Check if confidence exceeds threshold" },
  { label: "map", kind: CompletionItemKind.Method, detail: "Transform the wrapped value" },
];

export function provideCompletions(
  state: DocumentState,
  position: Position,
  document: TextDocument
): CompletionItem[] {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const lineText = text.substring(text.lastIndexOf("\n", offset - 1) + 1, offset);

  const items: CompletionItem[] = [];

  // After a dot: provide member completions
  if (lineText.trimEnd().endsWith(".")) {
    items.push(...UNCERTAIN_METHODS);
    // Add field completions for known types
    for (const [name, decl] of state.typeDecls) {
      for (const field of decl.fields) {
        items.push({
          label: field.name,
          kind: CompletionItemKind.Field,
          detail: `${name}.${field.name}`,
        });
      }
    }
    return items;
  }

  // After < in think/infer: provide type completions
  const thinkTypeMatch = lineText.match(/(think|infer)\s*<\s*(\w*)$/);
  if (thinkTypeMatch) {
    items.push(...PRIMITIVE_TYPES);
    for (const name of state.typeDecls.keys()) {
      items.push({
        label: name,
        kind: CompletionItemKind.Struct,
        detail: `type ${name}`,
      });
    }
    return items;
  }

  // After : in type annotation context: provide types
  const typeAnnotationMatch = lineText.match(/:\s*(\w*)$/);
  if (typeAnnotationMatch) {
    items.push(...PRIMITIVE_TYPES);
    for (const name of state.typeDecls.keys()) {
      items.push({
        label: name,
        kind: CompletionItemKind.Struct,
        detail: `type ${name}`,
      });
    }
    return items;
  }

  // Default: keywords + variables in scope + types
  items.push(...KEYWORDS);

  const bindings = state.scope.allBindings();
  for (const binding of bindings) {
    items.push({
      label: binding.name,
      kind: binding.type.kind === "function" ? CompletionItemKind.Function : CompletionItemKind.Variable,
      detail: binding.name,
    });
  }

  for (const name of state.typeDecls.keys()) {
    items.push({
      label: name,
      kind: CompletionItemKind.Struct,
      detail: `type ${name}`,
    });
  }

  return items;
}
