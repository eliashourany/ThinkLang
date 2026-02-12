import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { CompleteOptions, CompleteResult } from "../runtime/provider.js";

export interface SnapshotEntry {
  request: {
    systemPrompt: string;
    userMessage: string;
    jsonSchema?: Record<string, unknown>;
  };
  response: {
    value: unknown;
  };
  metadata: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  };
}

export interface SnapshotFile {
  version: number;
  entries: SnapshotEntry[];
}

export function loadSnapshot(filePath: string): SnapshotFile | null {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as SnapshotFile;
}

export function saveSnapshot(filePath: string, snapshot: SnapshotFile): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

export function createEmptySnapshot(): SnapshotFile {
  return { version: 1, entries: [] };
}

export function addSnapshotEntry(
  snapshot: SnapshotFile,
  options: CompleteOptions,
  result: CompleteResult
): void {
  snapshot.entries.push({
    request: {
      systemPrompt: options.systemPrompt,
      userMessage: options.userMessage,
      jsonSchema: options.jsonSchema,
    },
    response: {
      value: result.data,
    },
    metadata: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      model: result.model,
    },
  });
}
