// Internal type representations for the ThinkLang type checker

export type TlType =
  | TlPrimitiveType
  | TlArrayType
  | TlOptionalType
  | TlUnionType
  | TlObjectType
  | TlConfidentType
  | TlUncertainType
  | TlFunctionType
  | TlUnknownType;

export interface TlPrimitiveType {
  kind: "primitive";
  name: "string" | "int" | "float" | "bool" | "null";
}

export interface TlArrayType {
  kind: "array";
  elementType: TlType;
}

export interface TlOptionalType {
  kind: "optional";
  innerType: TlType;
}

export interface TlUnionType {
  kind: "union";
  members: TlType[];
}

export interface TlObjectType {
  kind: "object";
  name: string;
  fields: Map<string, TlType>;
}

export interface TlConfidentType {
  kind: "confident";
  innerType: TlType;
}

export interface TlUncertainType {
  kind: "uncertain";
  innerType: TlType;
}

export interface TlFunctionType {
  kind: "function";
  params: TlType[];
  returnType: TlType;
}

export interface TlUnknownType {
  kind: "unknown";
}

// Helpers

export function makeString(): TlPrimitiveType {
  return { kind: "primitive", name: "string" };
}

export function makeInt(): TlPrimitiveType {
  return { kind: "primitive", name: "int" };
}

export function makeFloat(): TlPrimitiveType {
  return { kind: "primitive", name: "float" };
}

export function makeBool(): TlPrimitiveType {
  return { kind: "primitive", name: "bool" };
}

export function makeNull(): TlPrimitiveType {
  return { kind: "primitive", name: "null" };
}

export function makeUnknown(): TlUnknownType {
  return { kind: "unknown" };
}

export function makeUncertain(inner: TlType): TlUncertainType {
  return { kind: "uncertain", innerType: inner };
}

export function makeConfident(inner: TlType): TlConfidentType {
  return { kind: "confident", innerType: inner };
}

export function typeToString(t: TlType): string {
  switch (t.kind) {
    case "primitive": return t.name;
    case "array": return `${typeToString(t.elementType)}[]`;
    case "optional": return `${typeToString(t.innerType)}?`;
    case "union": return t.members.map(typeToString).join(" | ");
    case "object": return t.name;
    case "confident": return `Confident<${typeToString(t.innerType)}>`;
    case "uncertain": return `uncertain ${typeToString(t.innerType)}`;
    case "function": return `fn(${t.params.map(typeToString).join(", ")}) -> ${typeToString(t.returnType)}`;
    case "unknown": return "unknown";
  }
}
