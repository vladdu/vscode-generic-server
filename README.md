[![Build Status](https://travis-ci.org/vladdu/vscode-generic-server.svg?branch=master)](https://travis-ci.org/vladdu/vscode-generic-server.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/vladdu/vscode-generic-server/badge.svg?branch=master)](https://coveralls.io/github/vladdu/vscode-generic-server?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

# Overview

The LSP servers implemented by Microsoft use the same base structure (simplified): a cache for the parsed documents and a dispatcher to a "language service". Except for the latter, these are quite generic and I think they could be published as such, so that other implementors only need to implement the language service (unless they need something more advanced or entirely different).

My plan is to submit this to vscode once it is stable enough.

# Using this module in other modules

Here is a quick example of how this module can be used in other modules. The file `src/index.ts` is a [barrel](https://basarat.gitbooks.io/typescript/content/docs/tips/barrel.html) that re-exports selected exports from other files. The _package.json_ file contains `main` attribute that points to the generated `lib/index.js` file and `typings` attribute that points to the generated `lib/index.d.ts` file.

> If you are planning to have code in multiple files (which is quite natural for a NodeJS module) that users can import, make sure you update `src/index.ts` file appropriately.

Now assuming you have published this amazing module to _npm_ with the name `my-amazing-lib`, and installed it in the module in which you need it -

- To use the `Greeter` class in a TypeScript file -

```ts
import { Greeter } from "my-amazing-lib";

const greeter = new Greeter("World!");
greeter.greet();
```

- To use the `Greeter` class in a JavaScript file -

```js
const Greeter = require('my-amazing-lib').Greeter;

const greeter = new Greeter('World!');
greeter.greet();
```

