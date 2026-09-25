import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, customerDocument } from "../lib/domain/calculate";
import {
  newLine,
  packageLine,
  quotationSchema,
  resetBank,
  selectTax,
} from "../lib/domain/model";
import { item, quote } from "./fixtures";

test("PAR LED: 20 units for 2 days matches expected totals; 50 units remains valid", () => {
  const q = quote();
  const totals = calculate(q);
  assert.equal(totals.net, "14000000");
  assert.equal(totals.cost, "7000000");
  assert.equal(totals.profit, "7000000");
  q.lines[0].quantity = "50";
  assert.equal(quotationSchema.safeParse(q).success, true);
  assert.equal(calculate(q).net, "35000000");
});
test("line discounts precede overall discounts; percentage and fixed discounts precede added taxes", () => {
  const q = quote();
  q.lines[0].discount = { type: "PERCENT", value: "10" };
  q.discount = { type: "AMOUNT", value: "600000" };
  q.ppnEnabled = q.pphEnabled = true;
  const c = calculate(q);
  assert.equal(c.lineDiscount, "1400000");
  assert.equal(c.net, "12000000");
  assert.equal(c.ppn, "1320000");
  assert.equal(c.pph, "240000");
  assert.equal(c.total, "13560000");
  assert.equal(c.profit, "5000000");
  q.lines[0].discount = { type: "AMOUNT", value: "4000000" };
  q.discount = { type: "PERCENT", value: "20" };
  assert.equal(calculate(q).net, "8000000");
});
test("all VAT/income-tax combinations and configurable rates leave profit unchanged", () => {
  for (const ppn of [false, true])
    for (const pph of [false, true]) {
      const q = quote();
      q.ppnEnabled = ppn;
      q.pphEnabled = pph;
      const c = calculate(q);
      assert.equal(
        c.total,
        String(14000000 + (ppn ? 1540000 : 0) + (pph ? 280000 : 0)),
      );
      assert.equal(c.profit, "7000000");
    }
  const q = quote();
  q.ppnEnabled = q.pphEnabled = true;
  q.ppnRate = "12";
  q.pphRate = "3.5";
  assert.equal(calculate(q).total, "16170000");
});
test("selling and cost bases are independent; unknown costs differ from zero", () => {
  const q = quote();
  q.lines[0].sellingBasis = "ONE_TIME";
  assert.equal(calculate(q).net, "7000000");
  assert.equal(calculate(q).cost, "7000000");
  q.lines[0].cost.basis = "ONE_TIME";
  assert.equal(calculate(q).cost, "3500000");
  q.lines[0].cost.amount = null;
  assert.equal(calculate(q).complete, false);
  assert.equal(calculate(q).profit, null);
  q.lines[0].cost.amount = "0";
  assert.equal(calculate(q).complete, true);
  assert.equal(calculate(q).profit, "7000000");
});
test("packages count revenue once and multiply component quantities by package quantity", () => {
  const q = quote();
  const pack = packageLine(
    {
      id: crypto.randomUUID(),
      name: "10,000 Watt Sound System",
      description: "",
      sellingPrice: "1000000",
      sellingBasis: "DAILY",
      active: true,
      components: [{ itemId: item.id, quantity: "4" }],
    },
    [item],
  );
  pack.quantity = "2";
  pack.duration = "2";
  pack.components[0].duration = "3";
  pack.components[0].cost.amount = "10000";
  const transport = newLine();
  transport.name = "Transport";
  transport.quantity = "1";
  transport.cost.amount = "200000";
  transport.cost.basis = "ONE_TIME";
  transport.duration = "10";
  pack.components.push(transport);
  q.lines = [pack];
  const c = calculate(q);
  assert.equal(c.net, "4000000");
  assert.equal(c.cost, "640000");
  assert.equal(c.profit, "3360000");
  assert.equal(customerDocument(q).lines[0].components[0].quantity, "8");
  pack.components.splice(1);
  assert.equal(calculate(q).cost, "240000");
});
test("half-up rounding for lines, discounts, costs, and taxes avoids floating-point errors", () => {
  const q = quote();
  const l = q.lines[0];
  l.quantity = "1";
  l.duration = "1";
  l.sellingPrice = "100.5";
  l.cost.amount = "20.5";
  l.discount = { type: "PERCENT", value: "50" };
  q.ppnEnabled = true;
  q.ppnRate = "1";
  const c = calculate(q);
  assert.equal(c.gross, "101");
  assert.equal(c.lineDiscount, "51");
  assert.equal(c.net, "50");
  assert.equal(c.cost, "21");
  assert.equal(c.ppn, "1");
  assert.equal(c.total, "51");
  l.quantity = "3";
  l.sellingPrice = "0.1";
  l.discount.value = "0";
  assert.equal(calculate(q).gross, "0");
});
test("validates discount limits, positive quantities, dates, and tax rates", () => {
  const q = quote();
  q.discount.value = "101";
  assert.throws(() => calculate(q), /Discount/);
  q.discount = { type: "AMOUNT", value: "14000001" };
  assert.throws(() => calculate(q), /Discount/);
  q.discount = { type: "AMOUNT", value: "14000000.1" };
  assert.throws(() => calculate(q), /Discount/);
  q.discount = { type: "PERCENT", value: "0" };
  q.lines[0].quantity = "0";
  assert.equal(quotationSchema.safeParse(q).success, false);
  q.lines[0].quantity = "1";
  q.ppnRate = "101";
  assert.equal(quotationSchema.safeParse(q).success, false);
  q.ppnRate = "11";
  q.validUntil = "2026-09-01";
  assert.equal(quotationSchema.safeParse(q).success, false);
});
test("bank selection follows VAT, preserves manual edits, and resets to snapshotted defaults", () => {
  let q = quote();
  q.bankDefaults = {
    tax: { bank: "Tax", number: "111", holder: "YW" },
    regular: { bank: "Regular", number: "222", holder: "YW" },
  };
  q = selectTax(q, true);
  assert.equal(q.bank.number, "111");
  q = selectTax(q, false);
  q.pphEnabled = true;
  assert.equal(q.bank.number, "222");
  q.bankMode = "MANUAL";
  q.bank.number = "999";
  q = selectTax(q, true);
  assert.equal(q.bank.number, "999");
  q = resetBank(q);
  assert.equal(q.bankMode, "AUTO");
  assert.equal(q.bank.number, "111");
});
test("customer projection excludes cost sources, vendors, profit, and alternative bank accounts", () => {
  const q = quote();
  q.bankDefaults.tax.number = "SECRET_ALTERNATE_BANK";
  const doc = customerDocument(q);
  const json = JSON.stringify(doc);
  for (const forbidden of [
    "175000",
    "Vendor B PRIVATE",
    "vendorId",
    "vendorPriceId",
    "cost",
    "profit",
    "bankDefaults",
    "SECRET_ALTERNATE_BANK",
  ])
    assert.ok(!json.includes(forbidden), forbidden);
});
test("quotation items and packages are independent copies of their templates", () => {
  const source = structuredClone(item);
  const l = newLine(source);
  l.name = "Custom label";
  l.sellingPrice = "1";
  l.cost.amount = "0";
  assert.equal(source.name, item.name);
  assert.equal(source.internalCost, "150000");
});
