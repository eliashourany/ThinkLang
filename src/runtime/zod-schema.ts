import type { ZodType } from "zod";

export interface ZodSchemaResult<T> {
  jsonSchema: Record<string, unknown>;
  /** Phantom field for type inference — not present at runtime. */
  _type?: T;
}

/**
 * Converts a Zod schema into the JSON Schema object expected by think/infer/reason.
 *
 * Usage:
 *   const Sentiment = z.object({ label: z.string(), score: z.number() });
 *   const result = await think({ prompt: "...", ...zodSchema(Sentiment) });
 */
export function zodSchema<T>(schema: ZodType<T>): ZodSchemaResult<T> {
  return { jsonSchema: zodToJsonSchema(schema) };
}

function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const def = (schema as any)._def;
  const typeName: string = def?.typeName ?? "";

  switch (typeName) {
    case "ZodString":
      return applyDescription(def, { type: "string" });

    case "ZodNumber":
      return applyDescription(def, { type: "number" });

    case "ZodBoolean":
      return applyDescription(def, { type: "boolean" });

    case "ZodLiteral":
      return applyDescription(def, { type: typeof def.value, const: def.value });

    case "ZodEnum":
      return applyDescription(def, { type: "string", enum: def.values });

    case "ZodNativeEnum":
      return applyDescription(def, { type: "string", enum: Object.values(def.values) });

    case "ZodArray":
      return applyDescription(def, {
        type: "array",
        items: zodToJsonSchema(def.type),
      });

    case "ZodObject": {
      const shape = (schema as any).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldDef = (value as any)?._def;
        if (fieldDef?.typeName === "ZodOptional") {
          properties[key] = zodToJsonSchema(fieldDef.innerType);
        } else {
          properties[key] = zodToJsonSchema(value as ZodType<unknown>);
          required.push(key);
        }
      }

      const result: Record<string, unknown> = {
        type: "object",
        properties,
        additionalProperties: false,
      };
      if (required.length > 0) {
        result.required = required;
      }
      return applyDescription(def, result);
    }

    case "ZodOptional":
      return zodToJsonSchema(def.innerType);

    case "ZodNullable": {
      const inner = zodToJsonSchema(def.innerType);
      return { anyOf: [inner, { type: "null" }] };
    }

    case "ZodUnion": {
      const options = (def.options as ZodType<unknown>[]).map(zodToJsonSchema);
      return { anyOf: options };
    }

    case "ZodDiscriminatedUnion": {
      const options = ([...def.options.values()] as ZodType<unknown>[]).map(zodToJsonSchema);
      return { anyOf: options };
    }

    case "ZodEffects":
      // .refine() / .transform() — use the inner schema
      return zodToJsonSchema(def.schema);

    case "ZodDefault":
      return zodToJsonSchema(def.innerType);

    case "ZodRecord": {
      const valueSchema = zodToJsonSchema(def.valueType);
      return applyDescription(def, {
        type: "object",
        additionalProperties: valueSchema,
      });
    }

    case "ZodTuple": {
      const items = (def.items as ZodType<unknown>[]).map(zodToJsonSchema);
      return applyDescription(def, { type: "array", items, minItems: items.length, maxItems: items.length });
    }

    default:
      // Fallback for unknown types
      return {};
  }
}

function applyDescription(def: any, schema: Record<string, unknown>): Record<string, unknown> {
  if (def?.description) {
    schema.description = def.description;
  }
  return schema;
}
