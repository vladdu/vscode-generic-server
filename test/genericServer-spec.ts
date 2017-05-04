
/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { ServerBase } from "../src/genericServer";
import * as chai from "chai";

const expect = chai.expect;

interface D {

}

interface S {

}

describe("server", () => {
  it("should create server", () => {
    const server = new ServerBase<D, S>();
    expect(server.init);
  });
});
