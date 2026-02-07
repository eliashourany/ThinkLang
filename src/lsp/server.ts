import {
  createConnection,
  ProposedFeatures,
  InitializeResult,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
} from "vscode-languageserver/node.js";
import { DocumentManager } from "./document-manager.js";
import { provideHover } from "./hover-provider.js";
import { provideCompletions } from "./completion-provider.js";
import { provideDefinition } from "./definition-provider.js";
import { provideDocumentSymbols } from "./symbols-provider.js";
import { provideSignatureHelp } from "./signature-provider.js";

const connection = createConnection(ProposedFeatures.all);
const docManager = new DocumentManager();

connection.onInitialize(async () => {
  await docManager.init();

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: [".", "<", ":"],
      },
      definitionProvider: true,
      documentSymbolProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ","],
      },
    },
  };
  return result;
});

// Analyze on open and change
docManager.documents.onDidOpen((event) => {
  const state = docManager.analyze(event.document.uri, event.document.getText());
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: state.diagnostics });
});

docManager.documents.onDidChangeContent((event) => {
  const state = docManager.analyze(event.document.uri, event.document.getText());
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: state.diagnostics });
});

// Hover
connection.onHover((params) => {
  const state = docManager.getState(params.textDocument.uri);
  if (!state) return null;
  return provideHover(state, params.position);
});

// Completion
connection.onCompletion((params) => {
  const state = docManager.getState(params.textDocument.uri);
  const doc = docManager.documents.get(params.textDocument.uri);
  if (!state || !doc) return [];
  return provideCompletions(state, params.position, doc);
});

// Go to Definition
connection.onDefinition((params) => {
  const state = docManager.getState(params.textDocument.uri);
  if (!state) return null;
  return provideDefinition(state, params.position, params.textDocument.uri);
});

// Document Symbols
connection.onDocumentSymbol((params) => {
  const state = docManager.getState(params.textDocument.uri);
  if (!state) return [];
  return provideDocumentSymbols(state);
});

// Signature Help
connection.onSignatureHelp((params) => {
  const state = docManager.getState(params.textDocument.uri);
  const doc = docManager.documents.get(params.textDocument.uri);
  if (!state || !doc) return null;
  return provideSignatureHelp(state, params.position, doc);
});

docManager.documents.listen(connection);
connection.listen();
