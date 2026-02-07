import type { CompleteOptions, CompleteResult, ModelProvider } from "../runtime/provider.js";
import type { SnapshotFile } from "./snapshot.js";

export class ReplayProvider implements ModelProvider {
  private entries: SnapshotFile["entries"];
  private cursor = 0;

  constructor(snapshot: SnapshotFile) {
    this.entries = snapshot.entries;
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    if (this.cursor >= this.entries.length) {
      throw new Error(
        `ReplayProvider: no more snapshot entries. Expected at most ${this.entries.length} calls.`
      );
    }

    const entry = this.entries[this.cursor++];
    return {
      data: entry.response.value,
      usage: {
        inputTokens: entry.metadata.inputTokens,
        outputTokens: entry.metadata.outputTokens,
      },
      model: entry.metadata.model,
    };
  }

  get remaining(): number {
    return this.entries.length - this.cursor;
  }
}
