import { describe, expect, it } from "vitest";
import { expectedValue } from "../../src/utils/expectedValue.js";

describe("expectedValue", () => {
  it("case 1", () => {
    expect(expectedValue(0.76, -200)).toBe(14);
  });
  it("case 2", () => {
    expect(expectedValue(0.3, -500)).toBe(-64);
  });
  it("case 3", () => {
    expect(expectedValue(0.6, 250)).toBe(110);
  });
  it("case 4", () => {
    expect(expectedValue(0.2, -200)).toBe(-70);
  });
  it("case 5", () => {
    expect(expectedValue(0.8137, -200)).toBe(22.05);
  });
  it("case 6", () => {
    expect(expectedValue(0.2175, -550)).toBe(-74.3);
  });
  it("case 7", () => {
    expect(expectedValue(0.5298, 1000)).toBe(482.78);
  });
  it("case 8", () => {
    expect(expectedValue(0.638, 275)).toBe(139.25);
  });
});
