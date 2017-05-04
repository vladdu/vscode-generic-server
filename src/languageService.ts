import {
  CodeActionContext, Command, CompletionList,
  createConnection, Diagnostic, DocumentHighlight, FormattingOptions, Hover, IConnection,
  InitializeParams, InitializeResult, Location, Position, Range,
  RequestType, SymbolInformation, TextDocument, TextDocuments, TextEdit, WorkspaceEdit,
} from "vscode-languageserver";

export interface ILanguageService<Model, Settings> {
  configure(raw: Settings): void;
  parseDocument(document: TextDocument): Model;

  doValidation(document: TextDocument, model: Model): Diagnostic[];
  doComplete(document: TextDocument, position: Position, model: Model): CompletionList;
  doHover(document: TextDocument, position: Position, model: Model): Thenable<Hover>;
  findDefinition(document: TextDocument, position: Position, model: Model): Location;
  findReferences(document: TextDocument, position: Position, model: Model): Location[];
  findDocumentHighlights(document: TextDocument, position: Position, model: Model): DocumentHighlight[];
  findDocumentSymbols(document: TextDocument, model: Model): SymbolInformation[];
  doCodeActions(document: TextDocument, range: Range, context: CodeActionContext, model: Model): Command[];
  doRename(document: TextDocument, position: Position, newName: string, model: Model): WorkspaceEdit;
  format(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
}
