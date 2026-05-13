import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  calculateKellyCriterion,
} from "../../src/utils/kellyCriterion.js";

describe("americanToDecimal", () => {
  it("matches Python convention for negative odds", () => {
    expect(americanToDecimal(-110)).toBe(0.91);
  });
});

describe("calculateKellyCriterion", () => {
  it("case 1", () => {
    expect(calculateKellyCriterion(-110, 0.6)).toBe(16.04);
  });
  it("case 2 — no edge", () => {
    expect(calculateKellyCriterion(-110, 0.4)).toBe(0);
  });
  it("case 3", () => {
    expect(calculateKellyCriterion(400, 0.35)).toBe(18.75);
  });
  it("case 4", () => {
    expect(calculateKellyCriterion(-500, 0.85)).toBe(10);
  });
  it("case 5", () => {
    expect(calculateKellyCriterion(100, 0.99)).toBe(98);
  });
});
