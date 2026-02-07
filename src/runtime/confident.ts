import { ConfidenceTooLow } from "./errors.js";

export class Confident<T> {
  readonly value: T;
  readonly confidence: number;
  readonly reasoning: string;

  constructor(value: T, confidence: number, reasoning: string = "") {
    this.value = value;
    this.confidence = confidence;
    this.reasoning = reasoning;
  }

  isConfident(threshold: number = 0.7): boolean {
    return this.confidence >= threshold;
  }

  unwrap(threshold: number = 0.0): T {
    if (this.confidence < threshold) {
      throw new ConfidenceTooLow(threshold, this.confidence);
    }
    return this.value;
  }

  expect(threshold: number): T {
    if (this.confidence < threshold) {
      throw new ConfidenceTooLow(threshold, this.confidence);
    }
    return this.value;
  }

  or(fallback: T): T {
    return this.isConfident() ? this.value : fallback;
  }

  map<U>(fn: (value: T) => U): Confident<U> {
    return new Confident(fn(this.value), this.confidence, this.reasoning);
  }

  static combine<T>(items: Confident<T>[]): Confident<T[]> {
    const values = items.map(i => i.value);
    const avgConfidence = items.reduce((s, i) => s + i.confidence, 0) / items.length;
    const reasons = items.map(i => i.reasoning).filter(Boolean).join("; ");
    return new Confident(values, avgConfidence, reasons);
  }

  toString(): string {
    return `Confident(${JSON.stringify(this.value)}, confidence=${this.confidence})`;
  }

  toJSON(): { value: T; confidence: number; reasoning: string } {
    return { value: this.value, confidence: this.confidence, reasoning: this.reasoning };
  }
}
