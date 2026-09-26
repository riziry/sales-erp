import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatNumberInput,
  parseNumberInput,
  numberCaret,
} from "../lib/domain/number-input";
test("price presentation groups rupiah while preserving exact decimals and empty input", () => {
  for (const [raw, display] of [
    ["100000", "100.000"],
    ["1000000.125", "1.000.000,125"],
    ["0", "0"],
    ["", ""],
    ["175000.", "175.000,"],
  ]) {
    assert.equal(formatNumberInput(raw), display);
    assert.equal(parseNumberInput(display), raw);
  }
  assert.equal(parseNumberInput("Rp 12.345.678,50"), "12345678.50");
  assert.equal(parseNumberInput("0000123"), "123");
  assert.equal(parseNumberInput("-1"), null);
  assert.equal(parseNumberInput("1,2,3"), null);
  assert.equal(parseNumberInput("1e9"), null);
  assert.equal(parseNumberInput("1234567890123"), null);
  assert.equal(parseNumberInput("1,12345"), null);
});
test("cursor placement counts digits rather than grouping separators", () => {
  assert.equal(numberCaret("100.000", 4), 5);
  assert.equal(numberCaret("1.234.567,89", 8), 10);
  assert.equal(numberCaret("100.000", 0), 0);
  assert.equal(numberCaret("100", 10), 3);
});
