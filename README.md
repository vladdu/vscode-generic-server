# vscode-generic-server

The LSP servers implemented by Microsoft use the same base structure (simplified): a cache for the parsed documents and a dispatcher to a "language service". Except for the latter, these are quite generic and I think they could be published as such, so that other implementors only need to implement the language service (unless they need something more advanced or entirely different).
