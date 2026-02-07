import type {
  TypeExpressionNode,
  TypeDeclarationNode,
  TypeFieldNode,
} from "../ast/nodes.js";

export type TypeDeclMap = Map<string, TypeDeclarationNode>;

export function typeExprToJsonSchema(
  typeExpr: TypeExpressionNode,
  typeDecls: TypeDeclMap
): Record<string, unknown> {
  switch (typeExpr.type) {
    case "PrimitiveType":
      return primitiveTyToSchema(typeExpr.name);

    case "NamedType": {
      const decl = typeDecls.get(typeExpr.name);
      if (!decl) {
        // Treat as a string enum value or unknown named type
        return { type: "object" };
      }
      return typeDeclarationToSchema(decl, typeDecls);
    }

    case "ArrayType":
      return {
        type: "array",
        items: typeExprToJsonSchema(typeExpr.elementType, typeDecls),
      };

    case "OptionalType":
      return {
        anyOf: [
          typeExprToJsonSchema(typeExpr.innerType, typeDecls),
          { type: "null" },
        ],
      };

    case "UnionType":
      return {
        anyOf: typeExpr.members.map(m => typeExprToJsonSchema(m, typeDecls)),
      };

    case "ConfidentType":
      return confidentSchema(typeExpr.innerType, typeDecls);

    default:
      return { type: "object" };
  }
}

function primitiveTyToSchema(name: string): Record<string, unknown> {
  switch (name) {
    case "string": return { type: "string" };
    case "int": return { type: "integer" };
    case "float": return { type: "number" };
    case "bool": return { type: "boolean" };
    case "null": return { type: "null" };
    default: return { type: "string" };
  }
}

function confidentSchema(
  innerType: TypeExpressionNode,
  typeDecls: TypeDeclMap
): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: typeExprToJsonSchema(innerType, typeDecls),
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reasoning: { type: "string" },
    },
    required: ["value", "confidence", "reasoning"],
    additionalProperties: false,
  };
}

export function typeDeclarationToSchema(
  decl: TypeDeclarationNode,
  typeDecls: TypeDeclMap
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of decl.fields) {
    const fieldSchema = typeExprToJsonSchema(field.typeExpr, typeDecls);
    applyAnnotations(fieldSchema, field);
    properties[field.name] = fieldSchema;

    // Optional fields (T?) are not required
    if (field.typeExpr.type !== "OptionalType") {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function applyAnnotations(
  schema: Record<string, unknown>,
  field: TypeFieldNode
): void {
  for (const ann of field.annotations) {
    switch (ann.name) {
      case "description":
        schema.description = ann.value;
        break;
      case "range":
        // @range annotations are typically numeric ranges
        if (typeof ann.value === "string") {
          const parts = ann.value.split("..");
          if (parts.length === 2) {
            schema.minimum = Number(parts[0]);
            schema.maximum = Number(parts[1]);
          }
        }
        break;
      case "maxItems":
        schema.maxItems = Number(ann.value);
        break;
      case "minItems":
        schema.minItems = Number(ann.value);
        break;
      case "pattern":
        schema.pattern = ann.value;
        break;
      case "minLength":
        schema.minLength = Number(ann.value);
        break;
      case "maxLength":
        schema.maxLength = Number(ann.value);
        break;
    }
  }
}

export function typeExprToTsType(typeExpr: TypeExpressionNode): string {
  switch (typeExpr.type) {
    case "PrimitiveType":
      switch (typeExpr.name) {
        case "string": return "string";
        case "int":
        case "float": return "number";
        case "bool": return "boolean";
        case "null": return "null";
        default: return "unknown";
      }
    case "NamedType":
      return typeExpr.name;
    case "ArrayType":
      return `(${typeExprToTsType(typeExpr.elementType)})[]`;
    case "OptionalType":
      return `${typeExprToTsType(typeExpr.innerType)} | null`;
    case "UnionType":
      return typeExpr.members.map(m => typeExprToTsType(m)).join(" | ");
    case "ConfidentType":
      return `Confident<${typeExprToTsType(typeExpr.innerType)}>`;
    default:
      return "unknown";
  }
}
