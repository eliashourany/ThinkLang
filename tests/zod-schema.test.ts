import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodSchema } from "../src/runtime/zod-schema.js";

describe("zodSchema()", () => {
  it("converts a simple object schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = zodSchema(schema);
    expect(result.jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
      additionalProperties: false,
    });
  });

  it("converts string type", () => {
    const result = zodSchema(z.string());
    expect(result.jsonSchema).toEqual({ type: "string" });
  });

  it("converts number type", () => {
    const result = zodSchema(z.number());
    expect(result.jsonSchema).toEqual({ type: "number" });
  });

  it("converts boolean type", () => {
    const result = zodSchema(z.boolean());
    expect(result.jsonSchema).toEqual({ type: "boolean" });
  });

  it("converts enum type", () => {
    const result = zodSchema(z.enum(["positive", "negative", "neutral"]));
    expect(result.jsonSchema).toEqual({
      type: "string",
      enum: ["positive", "negative", "neutral"],
    });
  });

  it("converts array type", () => {
    const result = zodSchema(z.array(z.string()));
    expect(result.jsonSchema).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("handles optional fields", () => {
    const schema = z.object({
      name: z.string(),
      nickname: z.string().optional(),
    });
    const result = zodSchema(schema);
    expect(result.jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        nickname: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    });
  });

  it("converts nullable type", () => {
    const result = zodSchema(z.string().nullable());
    expect(result.jsonSchema).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });

  it("converts union type", () => {
    const result = zodSchema(z.union([z.string(), z.number()]));
    expect(result.jsonSchema).toEqual({
      anyOf: [{ type: "string" }, { type: "number" }],
    });
  });

  it("converts nested object", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string(),
      }),
    });
    const result = zodSchema(schema);
    expect(result.jsonSchema).toEqual({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
          required: ["name", "email"],
          additionalProperties: false,
        },
      },
      required: ["user"],
      additionalProperties: false,
    });
  });

  it("converts array of objects", () => {
    const schema = z.array(
      z.object({
        id: z.number(),
        label: z.string(),
      })
    );
    const result = zodSchema(schema);
    expect(result.jsonSchema).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          label: { type: "string" },
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    });
  });

  it("preserves descriptions", () => {
    const schema = z.object({
      name: z.string().describe("The user's full name"),
    });
    const result = zodSchema(schema);
    expect((result.jsonSchema as any).properties.name.description).toBe(
      "The user's full name"
    );
  });

  it("converts literal type", () => {
    const result = zodSchema(z.literal("hello"));
    expect(result.jsonSchema).toEqual({
      type: "string",
      const: "hello",
    });
  });

  it("converts record type", () => {
    const result = zodSchema(z.record(z.string(), z.number()));
    expect(result.jsonSchema).toEqual({
      type: "object",
      additionalProperties: { type: "number" },
    });
  });

  it("handles default values by unwrapping inner type", () => {
    const schema = z.object({
      count: z.number().default(0),
    });
    const result = zodSchema(schema);
    // Default fields should still appear as their inner type
    expect((result.jsonSchema as any).properties.count).toEqual({ type: "number" });
  });

  it("spreads into ThinkOptions correctly", () => {
    const schema = z.object({ text: z.string() });
    const result = zodSchema(schema);

    // Should have jsonSchema key for spreading into think()
    expect(result).toHaveProperty("jsonSchema");
    expect(result.jsonSchema).toHaveProperty("type", "object");

    // Simulates: think({ prompt: "...", ...zodSchema(MyType) })
    const options = { prompt: "test", ...result };
    expect(options.prompt).toBe("test");
    expect(options.jsonSchema).toBeDefined();
  });
});
