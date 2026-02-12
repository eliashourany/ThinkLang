import { defineTool, type Tool } from "./tools.js";

/**
 * Built-in tool: Fetch a URL and return the response body as text.
 * Opt-in — pass to agent's tools array to enable.
 */
export const fetchUrl: Tool<{ url: string }, string> = defineTool({
  name: "fetchUrl",
  description: "Fetch a URL via HTTP GET and return the response body as text",
  input: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to fetch" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  execute: async ({ url }) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  },
});

/**
 * Built-in tool: Read a local file.
 * Opt-in — pass to agent's tools array to enable.
 */
export const readFile: Tool<{ path: string }, string> = defineTool({
  name: "readFile",
  description: "Read a file from the local filesystem and return its contents",
  input: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to read" },
    },
    required: ["path"],
    additionalProperties: false,
  },
  execute: async ({ path }) => {
    const fs = await import("node:fs/promises");
    return fs.readFile(path, "utf-8");
  },
});

/**
 * Built-in tool: Write content to a local file.
 * Opt-in — pass to agent's tools array to enable.
 */
export const writeFile: Tool<{ path: string; content: string }, void> = defineTool({
  name: "writeFile",
  description: "Write content to a file on the local filesystem",
  input: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to write" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  execute: async ({ path, content }) => {
    const fs = await import("node:fs/promises");
    await fs.writeFile(path, content, "utf-8");
  },
});

/**
 * Built-in tool: Run a shell command.
 * Opt-in — pass to agent's tools array to enable.
 * Use with caution in production environments.
 */
export const runCommand: Tool<
  { command: string },
  { stdout: string; stderr: string; exitCode: number }
> = defineTool({
  name: "runCommand",
  description: "Run a shell command and return stdout, stderr, and exit code",
  input: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to execute" },
    },
    required: ["command"],
    additionalProperties: false,
  },
  execute: async ({ command }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? err.message,
        exitCode: err.code ?? 1,
      };
    }
  },
});
