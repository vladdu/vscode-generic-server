/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Copyright (c) 2017 Vlad Dumitrescu <vladdu55@gmail.com>
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";

import {
  CodeActionContext, Command, CompletionList,
  createConnection, Diagnostic, DocumentHighlight, Hover, IConnection,
  InitializeParams, InitializeResult, Location, Position, Range,
  RequestType, SymbolInformation, TextDocument, TextDocuments, WorkspaceEdit,
} from "vscode-languageserver";
import { getLanguageModelCache } from "./languageModelCache";

// import { getLanguageService, LanguageSettings, LanguageService } from 'vscode-geenr-languageservice';

export interface ILanguageService<Doc, Settings> {
  configure(raw: Settings): void;
  parseDocument(document: TextDocument): Doc;
  doValidation(document: TextDocument, parsed: Doc): Diagnostic[];
  doComplete(document: TextDocument, position: Position, parsed: Doc): CompletionList;
  doHover(document: TextDocument, position: Position, parsed: Doc): Hover;
  findDefinition(document: TextDocument, position: Position, parsed: Doc): Location;
  findReferences(document: TextDocument, position: Position, parsed: Doc): Location[];
  findDocumentHighlights(document: TextDocument, position: Position, parsed: Doc): DocumentHighlight[];
  findDocumentSymbols(document: TextDocument, parsed: Doc): SymbolInformation[];
  doCodeActions(document: TextDocument, range: Range, context: CodeActionContext, parsed: Doc): Command[];
  doRename(document: TextDocument, position: Position, newName: string, parsed: Doc): WorkspaceEdit;
}
export interface ILanguageSettings {
  validate?: boolean;
  lint?: any;
}

export class ServerBase<Doc, Settings> {

  public validationDelayMs = 200;

  // Create a connection for the server.
  private connection: IConnection;
  // Create a simple text document manager. The text document manager
  // supports full document sync only
  private documents: TextDocuments = new TextDocuments();
  private model: { [uri: string]: Doc } = {};

  private pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};

  private languageService: ILanguageService<Doc, Settings>;

  public init() {
    this.connection = createConnection();
    console.log = this.connection.console.log.bind(this.connection.console);
    console.error = this.connection.console.error.bind(this.connection.console);

    // Make the text document manager listen on the connection
    // for open, change and close text document events
    this.documents.listen(this.connection);

    const stylesheets = getLanguageModelCache<Doc>(10, 60,
      (document) => this.getLanguageService(document).parseDocument(document));
    this.documents.onDidClose((e) => {
      stylesheets.onDocumentRemoved(e.document);
    });

    this.connection.onShutdown(() => {
      stylesheets.dispose();
    });

    // After the server has started the client sends an initilize request. The server receives
    // in the passed params the rootPath of the workspace plus the client capabilities.
    this.connection.onInitialize((params: InitializeParams): InitializeResult => {
      const snippetSupport = params.capabilities && params.capabilities.textDocument &&
        params.capabilities.textDocument.completion &&
        params.capabilities.textDocument.completion.completionItem &&
        params.capabilities.textDocument.completion.completionItem.snippetSupport;
      return {
        capabilities: {
          codeActionProvider: true,
          completionProvider: snippetSupport ? { resolveProvider: false } : null,
          definitionProvider: true,
          documentHighlightProvider: true,
          documentSymbolProvider: true,
          hoverProvider: true,
          referencesProvider: true,
          renameProvider: true,
          // Tell the client that the server works in FULL text document sync mode
          textDocumentSync: this.documents.syncKind,
        },
      };
    });
    // The settings have changed. Is send on server activation as well.
    this.connection.onDidChangeConfiguration((change) => {
      this.updateConfiguration(change.settings as Settings);
    });

    // The content of a text document has changed. This event is emitted
    // when the text document first opened or when its content has changed.
    this.documents.onDidChangeContent((change) => {
      this.triggerValidation(change.document);
    });

    // a document has closed: clear all diagnostics
    this.documents.onDidClose((event) => {
      this.cleanPendingValidation(event.document);
      this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
    });

    this.connection.onCompletion((textDocumentPosition) => {
      const document = this.documents.get(textDocumentPosition.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).doComplete(document, textDocumentPosition.position, stylesheet);
    });

    this.connection.onHover((textDocumentPosition) => {
      const document = this.documents.get(textDocumentPosition.textDocument.uri);
      const styleSheet = stylesheets.get(document);
      return this.getLanguageService(document).doHover(document, textDocumentPosition.position, styleSheet);
    });

    this.connection.onDocumentSymbol((documentSymbolParams) => {
      const document = this.documents.get(documentSymbolParams.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).findDocumentSymbols(document, stylesheet);
    });

    this.connection.onDefinition((documentSymbolParams) => {
      const document = this.documents.get(documentSymbolParams.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).findDefinition(document, documentSymbolParams.position, stylesheet);
    });

    this.connection.onDocumentHighlight((documentSymbolParams) => {
      const document = this.documents.get(documentSymbolParams.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).findDocumentHighlights(document,
        documentSymbolParams.position, stylesheet);
    });

    this.connection.onReferences((referenceParams) => {
      const document = this.documents.get(referenceParams.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).findReferences(document, referenceParams.position, stylesheet);
    });

    this.connection.onCodeAction((codeActionParams) => {
      const document = this.documents.get(codeActionParams.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).doCodeActions(document,
        codeActionParams.range, codeActionParams.context, stylesheet);
    });

    this.connection.onRenameRequest((renameParameters) => {
      const document = this.documents.get(renameParameters.textDocument.uri);
      const stylesheet = stylesheets.get(document);
      return this.getLanguageService(document).doRename(document,
        renameParameters.position, renameParameters.newName, stylesheet);
    });
  }

  public start() {
    // Listen on the connection
    this.connection.listen();
  }

  private getLanguageService(document: TextDocument) {
    if (!this.languageService) {
      this.connection.console.log("Document type is " + document.languageId + ", using css instead.");
      this.languageService = void 0; // TODO
    }
    return this.languageService;
  }

  private updateConfiguration(settings: Settings) {
    this.languageService.configure(settings);
    // Revalidate any open text documents
    this.documents.all().forEach(this.triggerValidation);
  }

  private cleanPendingValidation(textDocument: TextDocument): void {
    const request = this.pendingValidationRequests[textDocument.uri];
    if (request) {
      clearTimeout(request);
      delete this.pendingValidationRequests[textDocument.uri];
    }
  }

  private triggerValidation(textDocument: TextDocument): void {
    this.cleanPendingValidation(textDocument);
    this.pendingValidationRequests[textDocument.uri] = setTimeout(() => {
      delete this.pendingValidationRequests[textDocument.uri];
      this.validateTextDocument(textDocument);
    }, this.validationDelayMs);
  }

  private validateTextDocument(textDocument: TextDocument): void {
    const stylesheet = this.model[textDocument.uri];
    const diagnostics = this.getLanguageService(textDocument).doValidation(textDocument, stylesheet);
    // Send the computed diagnostics to VSCode.
    this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }

}
