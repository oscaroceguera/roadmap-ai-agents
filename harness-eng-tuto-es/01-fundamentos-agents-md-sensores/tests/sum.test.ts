import { expect, it } from "vitest";
import { multiply, sum } from "../src/sum.js";

it("suma", () => {
  expect(sum(2, 3)).toBe(5);
});

it("multiplica", () => {
  expect(multiply(2, 3)).toBe(6);
  expect(multiply(-2, 3)).toBe(-6);
  expect(multiply(5, 0)).toBe(0);
});
