import type { ReasonStep } from "../runtime/reason.js";

export interface PromptResult {
  systemPrompt: string;
  userMessage: string;
}

export function buildThinkPrompt(
  prompt: string,
  context: Record<string, unknown>
): PromptResult {
  const systemPrompt = [
    "You are a structured data assistant for ThinkLang, an AI-native programming language.",
    "Your task is to produce structured output that precisely matches the requested JSON schema.",
    "Be accurate, concise, and follow the schema exactly.",
    "If you include a confidence score, it should reflect how certain you are about your answer (0.0 to 1.0).",
    "If you include reasoning, briefly explain your thought process.",
  ].join(" ");

  let userMessage = prompt;

  if (Object.keys(context).length > 0) {
    userMessage += "\n\nContext:\n" + JSON.stringify(context, null, 2);
  }

  return { systemPrompt, userMessage };
}

export function buildInferPrompt(
  value: unknown,
  hint: string | undefined,
  context: Record<string, unknown>
): PromptResult {
  const systemPrompt = [
    "You are an inference assistant for ThinkLang, an AI-native programming language.",
    "Your task is to analyze the given value and produce structured output matching the requested JSON schema.",
    "Use the value, any provided hint, and context to make your inference.",
    "Be accurate and follow the schema exactly.",
  ].join(" ");

  let userMessage = `Analyze this value: ${JSON.stringify(value)}`;

  if (hint) {
    userMessage += `\n\nHint: ${hint}`;
  }

  if (Object.keys(context).length > 0) {
    userMessage += "\n\nContext:\n" + JSON.stringify(context, null, 2);
  }

  return { systemPrompt, userMessage };
}

export function buildReasonPrompt(
  goal: string,
  steps: ReasonStep[],
  context: Record<string, unknown>
): PromptResult {
  const systemPrompt = [
    "You are a reasoning assistant for ThinkLang, an AI-native programming language.",
    "Your task is to work through a multi-step reasoning process and produce structured output.",
    "Follow each step carefully, building on previous reasoning.",
    "Your final output must match the requested JSON schema exactly.",
  ].join(" ");

  let userMessage = `Goal: ${goal}\n\nReasoning steps:`;

  for (const step of steps) {
    userMessage += `\n${step.number}. ${step.description}`;
  }

  userMessage += "\n\nWork through each step carefully, then produce your final structured answer.";

  if (Object.keys(context).length > 0) {
    userMessage += "\n\nContext:\n" + JSON.stringify(context, null, 2);
  }

  return { systemPrompt, userMessage };
}
