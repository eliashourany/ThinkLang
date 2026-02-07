import {
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  Position,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { DocumentState } from "./document-manager.js";

const BUILTIN_SIGNATURES: Record<string, SignatureInformation> = {
  think: {
    label: "think<Type>(prompt: string)",
    parameters: [
      { label: "prompt", documentation: "The prompt to send to the AI model" },
    ],
    documentation: "Ask the AI to generate a structured value of the given type",
  },
  infer: {
    label: "infer<Type>(value: any, hint?: string)",
    parameters: [
      { label: "value", documentation: "The value to analyze" },
      { label: "hint", documentation: "Optional hint for inference" },
    ],
    documentation: "Infer a structured value from the given input",
  },
};

export function provideSignatureHelp(
  state: DocumentState,
  position: Position,
  document: TextDocument
): SignatureHelp | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the opening paren before cursor position
  let parenDepth = 0;
  let commaCount = 0;
  let funcStart = -1;

  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") parenDepth++;
    else if (ch === "(") {
      if (parenDepth === 0) {
        funcStart = i;
        break;
      }
      parenDepth--;
    } else if (ch === "," && parenDepth === 0) {
      commaCount++;
    }
  }

  if (funcStart < 0) return null;

  // Extract function name before the paren (skip type params)
  let nameEnd = funcStart;
  // Handle think<Type>( — skip backwards past > ... <
  if (nameEnd > 0 && text[nameEnd - 1] === ">") {
    let angleDepth = 1;
    nameEnd -= 2;
    while (nameEnd >= 0 && angleDepth > 0) {
      if (text[nameEnd] === ">") angleDepth++;
      if (text[nameEnd] === "<") angleDepth--;
      nameEnd--;
    }
    nameEnd++; // point to <
  }

  // Extract identifier
  let nameStart = nameEnd;
  while (nameStart > 0 && /[a-zA-Z_0-9]/.test(text[nameStart - 1])) {
    nameStart--;
  }
  const funcName = text.substring(nameStart, nameEnd);

  // Check built-in signatures
  if (funcName in BUILTIN_SIGNATURES) {
    return {
      signatures: [BUILTIN_SIGNATURES[funcName]],
      activeSignature: 0,
      activeParameter: commaCount,
    };
  }

  // Check user-defined functions
  const binding = state.scope.lookup(funcName);
  if (binding?.type.kind === "function") {
    const params: ParameterInformation[] = binding.type.params.map((_, i) => ({
      label: `param${i}`,
    }));
    return {
      signatures: [
        {
          label: `${funcName}(${params.map(p => p.label).join(", ")})`,
          parameters: params,
        },
      ],
      activeSignature: 0,
      activeParameter: commaCount,
    };
  }

  return null;
}
