import { createInterface } from "readline";
import { ReplEvaluator } from "./evaluator.js";

export async function startRepl(): Promise<void> {
  const evaluator = new ReplEvaluator();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "tl> ",
  });

  console.log("ThinkLang REPL v0.1.0");
  console.log('Type .help for commands, .exit to quit\n');

  rl.prompt();

  let multilineBuffer = "";
  let braceDepth = 0;

  rl.on("line", async (line: string) => {
    const trimmed = line.trim();

    // Handle dot commands
    if (!multilineBuffer && trimmed.startsWith(".")) {
      switch (trimmed) {
        case ".exit":
          rl.close();
          return;
        case ".help":
          console.log("  .exit    Exit the REPL");
          console.log("  .clear   Clear REPL state");
          console.log("  .help    Show this help\n");
          rl.prompt();
          return;
        case ".clear":
          evaluator.clearState();
          console.log("State cleared.\n");
          rl.prompt();
          return;
        default:
          console.log(`Unknown command: ${trimmed}\n`);
          rl.prompt();
          return;
      }
    }

    // Track braces for multiline input
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }

    multilineBuffer += (multilineBuffer ? "\n" : "") + line;

    if (braceDepth > 0) {
      // Continue collecting multiline input
      process.stdout.write("... ");
      return;
    }

    // Execute the collected input
    const input = multilineBuffer;
    multilineBuffer = "";
    braceDepth = 0;

    if (!input.trim()) {
      rl.prompt();
      return;
    }

    try {
      const result = await evaluator.evaluate(input);
      if (result !== undefined) {
        if (typeof result === "object" && result !== null) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
    }

    console.log();
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}
