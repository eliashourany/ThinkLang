// Basic usage — call think() with a JSON schema
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/js/basic-think.ts

import { think } from "thinklang";

const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});

console.log(greeting);
