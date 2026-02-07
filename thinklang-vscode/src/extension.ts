import * as path from "path";
import { workspace, ExtensionContext } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node.js";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const config = workspace.getConfiguration("thinklang");
  const customServerPath = config.get<string>("lsp.serverPath");

  const serverModule = customServerPath
    ? customServerPath
    : context.asAbsolutePath(path.join("..", "dist", "lsp", "server.js"));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "thinklang" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.tl"),
    },
  };

  client = new LanguageClient(
    "thinklangLSP",
    "ThinkLang Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
