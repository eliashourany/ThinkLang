---
layout: home
hero:
  name: ThinkLang
  text: An AI-native programming language
  tagline: "Where think is a keyword — structured AI outputs, type safety, and agentic tool calling. Use as a language or a JS/TS library."
  actions:
    - theme: brand
      text: Get Started (Language)
      link: /guide/getting-started
    - theme: brand
      text: Get Started (Library)
      link: /library/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/eliashourany/ThinkLang

features:
  - title: AI as Syntax
    details: "think, infer, and reason are keywords, not library calls. The compiler validates types, catches errors, and generates optimized LLM calls."
  - title: Type-Safe Output
    details: "Define structured types in .tl files or use Zod schemas in JS/TS. The AI is constrained to return valid, schema-conforming data."
  - title: Agents & Tools
    details: "Declare tools and run multi-turn agentic loops as language constructs or library calls. The agent calls tools until it produces a final answer."
  - title: Use as a Library
    details: "import { think, agent, zodSchema } from 'thinklang' — use the same runtime directly in any JS/TS project. Zero config, full type safety."
  - title: Multi-Provider
    details: "Model-agnostic: Anthropic, OpenAI, Google Gemini, and Ollama out of the box. Swap providers with a single environment variable."
  - title: Production Ready
    details: "Guards for output validation, Confident<T> for uncertainty tracking, cost tracking, built-in test framework with snapshot replay, and an LSP-powered IDE."
---
