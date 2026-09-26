import Decimal from "decimal.js";
import type { Component, Discount, Line, Quotation } from "./model";
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const money = (v: Decimal) => v.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
function reduction(base: Decimal, discount: Discount) {
  const value = new Decimal(discount.value);
  if (value.isNegative() || (discount.type === "PERCENT" && value.gt(100)))
    throw new Error("Discount must be between 0 and 100%");
  if (discount.type === "AMOUNT" && value.gt(base))
    throw new Error("Discount cannot exceed the subtotal");
  const result = money(
    discount.type === "PERCENT" ? base.mul(value).div(100) : value,
  );
  if (result.gt(base)) throw new Error("Discount cannot exceed the subtotal");
  return result;
}
function costOf(c: Component, multiplier = "1") {
  return c.cost.amount === null
    ? null
    : money(
        new Decimal(c.quantity)
          .mul(multiplier)
          .mul(c.cost.basis === "DAILY" ? c.duration : 1)
          .mul(c.cost.amount),
      );
}
export function calculateLine(line: Line) {
  const gross = money(
    new Decimal(line.quantity)
      .mul(line.sellingBasis === "DAILY" ? line.duration : 1)
      .mul(line.sellingPrice),
  );
  const discount = reduction(gross, line.discount);
  const costs =
    line.type === "PACKAGE"
      ? line.components.map((c) => costOf(c, line.quantity))
      : [costOf(line)];
  const complete = costs.every((c) => c !== null);
  return {
    gross: gross.toFixed(0),
    discount: discount.toFixed(0),
    net: gross.minus(discount).toFixed(0),
    cost: complete
      ? costs
          .reduce<Decimal>((sum, c) => sum.plus(c!), new Decimal(0))
          .toFixed(0)
      : null,
  };
}
export function calculate(q: Quotation) {
  const lines = q.lines.map(calculateLine);
  const sum = (key: "gross" | "discount" | "net") =>
    lines.reduce((s, l) => s.plus(l[key]), new Decimal(0));
  const afterLines = sum("net");
  const overallDiscount = reduction(afterLines, q.discount);
  const net = afterLines.minus(overallDiscount);
  const ppn = q.ppnEnabled
    ? money(net.mul(q.ppnRate).div(100))
    : new Decimal(0);
  const pph = q.pphEnabled
    ? money(net.mul(q.pphRate).div(100))
    : new Decimal(0);
  const complete = lines.every((l) => l.cost !== null);
  const cost = complete
    ? lines.reduce((s, l) => s.plus(l.cost!), new Decimal(0))
    : null;
  return {
    lines,
    gross: sum("gross").toFixed(0),
    lineDiscount: sum("discount").toFixed(0),
    overallDiscount: overallDiscount.toFixed(0),
    net: net.toFixed(0),
    ppn: ppn.toFixed(0),
    pph: pph.toFixed(0),
    total: net.plus(ppn).plus(pph).toFixed(0),
    cost: cost?.toFixed(0) ?? null,
    profit: cost ? net.minus(cost).toFixed(0) : null,
    complete,
  };
}
export function customerDocument(q: Quotation) {
  const c = calculate(q);
  // Explicit allowlist: never pass the internal snapshot into the customer view.
  return {
    sales: q.sales
      ? {
          name: q.sales.name,
          phone: q.sales.phone,
          signature: q.sales.signature,
        }
      : null,
    company: {
      name: q.company.name,
      address: q.company.address,
      contact: q.company.contact,
      email: q.company.email,
      logo: q.company.logo ?? null,
    },
    customer: {
      name: q.customer.name,
      address: q.customer.address,
      contact: q.customer.contact,
      email: q.customer.email,
    },
    event: q.event,
    location: q.location,
    eventDate: q.eventDate,
    eventEndDate: q.eventEndDate || "",
    date: q.date,
    validUntil: q.validUntil,
    notes: q.notes,
    terms: q.terms,
    bank: q.bank,
    ppnEnabled: q.ppnEnabled,
    pphEnabled: q.pphEnabled,
    ppnRate: q.ppnRate,
    pphRate: q.pphRate,
    lines: q.lines.map((l, i) => ({
      name: l.name,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      duration: l.duration,
      sellingPrice: l.sellingPrice,
      sellingBasis: l.sellingBasis,
      discount: l.discount,
      gross: c.lines[i].gross,
      discountAmount: c.lines[i].discount,
      net: c.lines[i].net,
      components: l.components.map((p) => ({
        name: p.name,
        description: p.description,
        unit: p.unit,
        quantity: new Decimal(p.quantity).mul(l.quantity).toString(),
      })),
    })),
    gross: c.gross,
    lineDiscount: c.lineDiscount,
    overallDiscount: c.overallDiscount,
    net: c.net,
    ppn: c.ppn,
    pph: c.pph,
    total: c.total,
  };
}
export type CustomerDocument = ReturnType<typeof customerDocument>;
export function rupiah(value: string | null) {
  return value === null
    ? "Cost incomplete"
    : "Rp" +
        new Decimal(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
