import { afterEach, describe, expect, it } from "vitest";
import { dataSource } from "./data-source";

const original = process.env.DATA_SOURCE;
afterEach(() => {
  if (original === undefined) delete process.env.DATA_SOURCE;
  else process.env.DATA_SOURCE = original;
});

describe("dataSource", () => {
  it("default é nocodb", () => {
    delete process.env.DATA_SOURCE;
    expect(dataSource()).toBe("nocodb");
  });
  it("aceita oracle", () => {
    process.env.DATA_SOURCE = "oracle";
    expect(dataSource()).toBe("oracle");
  });
  it("valor inválido lança erro", () => {
    process.env.DATA_SOURCE = "xyz";
    expect(() => dataSource()).toThrow(/inválido/);
  });
});
