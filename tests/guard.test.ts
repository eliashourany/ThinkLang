import { describe, it, expect, beforeEach } from "vitest";
import { evaluateGuards } from "../src/runtime/guard.js";
import { withRetry } from "../src/runtime/retry.js";
import { GuardFailed } from "../src/runtime/errors.js";

describe("evaluateGuards()", () => {
  describe("length guard", () => {
    it("passes when length is within range", () => {
      const result = evaluateGuards("hello world", [
        { name: "length", constraint: 1, rangeEnd: 100 },
      ]);
      expect(result.passed).toBe(true);
    });

    it("throws GuardFailed when length is below range", () => {
      expect(() =>
        evaluateGuards("hi", [
          { name: "length", constraint: 10, rangeEnd: 100 },
        ])
      ).toThrow(GuardFailed);
    });

    it("throws GuardFailed when length is above range", () => {
      expect(() =>
        evaluateGuards("a".repeat(200), [
          { name: "length", constraint: 1, rangeEnd: 50 },
        ])
      ).toThrow(GuardFailed);
    });
  });

  describe("contains_none guard", () => {
    it("passes when no forbidden strings found", () => {
      const result = evaluateGuards("clean text", [
        { name: "contains_none", constraint: ["bad", "evil"] },
      ]);
      expect(result.passed).toBe(true);
    });

    it("throws when forbidden string found", () => {
      expect(() =>
        evaluateGuards("this is bad text", [
          { name: "contains_none", constraint: ["bad"] },
        ])
      ).toThrow(GuardFailed);
    });
  });

  describe("passes guard", () => {
    it("passes when validator returns true", () => {
      const result = evaluateGuards(42, [
        { name: "passes", constraint: (v: unknown) => typeof v === "number" },
      ]);
      expect(result.passed).toBe(true);
    });

    it("throws when validator returns false", () => {
      expect(() =>
        evaluateGuards("string", [
          { name: "passes", constraint: (v: unknown) => typeof v === "number" },
        ])
      ).toThrow(GuardFailed);
    });
  });

  describe("generic range guard", () => {
    it("passes when value is within range", () => {
      const result = evaluateGuards(50, [
        { name: "score", constraint: 0, rangeEnd: 100 },
      ]);
      expect(result.passed).toBe(true);
    });

    it("throws when value is out of range", () => {
      expect(() =>
        evaluateGuards(150, [
          { name: "score", constraint: 0, rangeEnd: 100 },
        ])
      ).toThrow(GuardFailed);
    });
  });
});

describe("withRetry()", () => {
  it("returns on first success", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return "success";
      },
      { attempts: 3 }
    );
    expect(result).toBe("success");
    expect(calls).toBe(1);
  });

  it("retries on failure", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return "success";
      },
      { attempts: 3, baseDelayMs: 1 }
    );
    expect(result).toBe("success");
    expect(calls).toBe(3);
  });

  it("calls onRetry hook", async () => {
    let retryAttempts: number[] = [];
    let calls = 0;

    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("fail");
        return "ok";
      },
      {
        attempts: 3,
        baseDelayMs: 1,
        onRetry: (attempt) => retryAttempts.push(attempt),
      }
    );

    expect(retryAttempts).toEqual([1]);
  });

  it("uses fallback after all retries exhausted", async () => {
    const result = await withRetry(
      async () => {
        throw new Error("always fails");
      },
      {
        attempts: 2,
        baseDelayMs: 1,
        fallback: () => "fallback value",
      }
    );
    expect(result).toBe("fallback value");
  });

  it("throws after all retries with no fallback", async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error("always fails");
        },
        { attempts: 2, baseDelayMs: 1 }
      )
    ).rejects.toThrow("always fails");
  });
});
