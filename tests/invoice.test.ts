import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { testDatabase } from "./database";
import { quote } from "./fixtures";
import {
  changeStatus,
  getQuotation,
  saveQuotation,
} from "../lib/server/repository";
import {
  createInvoice,
  getInvoice,
  listInvoices,
  saveInvoice,
  setInvoiceStatus,
} from "../lib/server/invoices";
import { invoiceAmounts, invoiceDetailsSchema } from "../lib/domain/invoice";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
});
after(async () => {
  await fixture?.close();
});
async function quotation() {
  return saveQuotation(fixture.db, { id: null, version: null, data: quote() });
}
test("installments reconcile inclusive total and taxes, including odd rupiah rounding", () => {
  for (const doc of [
    { net: "14000000", ppn: "1540000", pph: "280000", total: "15820000" },
    { net: "101", ppn: "11", pph: "2", total: "114" },
    { net: "1", ppn: "1", pph: "1", total: "3" },
    { net: "0", ppn: "0", pph: "0", total: "0" },
  ]) {
    const deposit = invoiceAmounts(doc, "DEPOSIT"),
      final = invoiceAmounts(doc, "FINAL");
    assert.deepEqual(invoiceAmounts(doc, "FULL"), doc);
    for (const key of ["net", "ppn", "pph", "total"] as const)
      assert.equal(
        new Decimal(deposit[key]).plus(final[key]).toFixed(0),
        doc[key],
      );
    assert.equal(
      new Decimal(deposit.net).plus(deposit.ppn).plus(deposit.pph).toFixed(0),
      deposit.total,
    );
    assert.equal(
      new Decimal(final.net).plus(final.ppn).plus(final.pph).toFixed(0),
      final.total,
    );
  }
});
test("concurrent repeated creation is idempotent and full billing conflicts with split billing", async () => {
  const q = await quotation();
  const copies = await Promise.all(
    Array.from({ length: 4 }, () =>
      createInvoice(fixture.db, q.id, q.version, "FULL"),
    ),
  );
  assert.equal(new Set(copies.map((invoice) => invoice.id)).size, 1);
  assert.match(copies[0].number, /^INV\/\d{4}\/\d{4}$/);
  await assert.rejects(
    createInvoice(fixture.db, q.id, q.version, "DEPOSIT"),
    /billing plan/,
  );
  const q2 = await quotation();
  await assert.rejects(
    createInvoice(fixture.db, q2.id, q2.version, "FINAL"),
    /down payment/,
  );
  const race = await Promise.allSettled([
    createInvoice(fixture.db, q2.id, q2.version, "FULL"),
    createInvoice(fixture.db, q2.id, q2.version, "DEPOSIT"),
  ]);
  assert.equal(
    race.filter((result) => result.status === "fulfilled").length,
    1,
  );
});
test("invoice snapshots omit private costing and survive quotation edits and revisions", async () => {
  const q = await quotation();
  const deposit = await createInvoice(fixture.db, q.id, q.version, "DEPOSIT");
  const snapshot = JSON.stringify(deposit.document);
  for (const privateField of [
    "vendorName",
    "vendorPriceId",
    "cost",
    "profit",
    "bankDefaults",
    "Vendor B PRIVATE",
    "175000",
  ])
    assert.ok(!snapshot.includes(privateField), privateField);
  const changed = quote();
  changed.lines[0].sellingPrice = "900000";
  changed.customer.name = "Changed customer";
  const edited = await saveQuotation(fixture.db, {
    id: q.id,
    version: q.version,
    data: changed,
  });
  await changeStatus(fixture.db, edited.id, edited.version, "SENT");
  const sent = (await getQuotation(fixture.db, q.id))!;
  const revised = await saveQuotation(fixture.db, {
    id: q.id,
    version: sent.version,
    data: changed,
  });
  const final = await createInvoice(
    fixture.db,
    revised.id,
    revised.version,
    "FINAL",
  );
  assert.deepEqual(final.document, deposit.document);
  assert.equal(final.quotationId, q.id);
  assert.equal(final.quotationRevision, 1);
  assert.equal(invoiceAmounts(final.document, "FINAL").total, "7000000");
  assert.equal(
    (await getInvoice(fixture.db, deposit.id))!.document.customer.name,
    "PT Event Nusantara",
  );
});
test("draft saves validate dates and version; issuing locks edits; voiding preserves documents", async () => {
  const q = await quotation();
  let invoice = await createInvoice(fixture.db, q.id, q.version, "DEPOSIT");
  assert.equal(
    invoiceDetailsSchema.safeParse({
      ...invoice.details,
      dueDate: "2000-01-01",
    }).success,
    false,
  );
  await assert.rejects(
    saveInvoice(fixture.db, invoice.id, invoice.version, {
      ...invoice.details,
      dueDate: "2000-01-01",
    }),
    /Due date/,
  );
  invoice = await saveInvoice(fixture.db, invoice.id, invoice.version, {
    ...invoice.details,
    notes: "Invoice-only notes",
    bank: {
      bank: "Test bank",
      number: "INVOICE-ACCOUNT",
      holder: "Test holder",
    },
  });
  await assert.rejects(
    saveInvoice(fixture.db, invoice.id, 1, invoice.details),
    /another tab/,
  );
  invoice = await setInvoiceStatus(
    fixture.db,
    invoice.id,
    invoice.version,
    "ISSUED",
  );
  await assert.rejects(
    saveInvoice(fixture.db, invoice.id, invoice.version, invoice.details),
    /Only draft/,
  );
  const final = await createInvoice(fixture.db, q.id, q.version, "FINAL");
  await assert.rejects(
    setInvoiceStatus(fixture.db, invoice.id, invoice.version, "VOID"),
    /final installment first/,
  );
  await setInvoiceStatus(fixture.db, final.id, final.version, "VOID");
  invoice = await setInvoiceStatus(
    fixture.db,
    invoice.id,
    invoice.version,
    "VOID",
  );
  assert.equal(invoice.details.notes, "Invoice-only notes");
  const replacement = await createInvoice(fixture.db, q.id, q.version, "FULL");
  assert.notEqual(replacement.number, invoice.number);
  assert.equal((await getInvoice(fixture.db, invoice.id))!.status, "VOID");
  assert.ok(
    (await listInvoices(fixture.db)).some((row) => row.id === final.id),
  );
});
test("empty, stale, rejected, and archived quotations cannot start a new billing plan", async () => {
  const data = quote();
  data.lines = [];
  const empty = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data,
  });
  await assert.rejects(
    createInvoice(fixture.db, empty.id, empty.version, "FULL"),
    /at least one/,
  );
  const q = await quotation();
  await assert.rejects(
    createInvoice(fixture.db, q.id, q.version + 1, "FULL"),
    /changed/,
  );
  await changeStatus(fixture.db, q.id, q.version, "SENT");
  let latest = (await getQuotation(fixture.db, q.id))!;
  await changeStatus(fixture.db, q.id, latest.version, "REJECTED");
  latest = (await getQuotation(fixture.db, q.id))!;
  await assert.rejects(
    createInvoice(fixture.db, q.id, latest.version, "FULL"),
    /rejected/,
  );
  await saveQuotation(fixture.db, {
    id: q.id,
    version: latest.version,
    data: quote(),
  });
  await assert.rejects(
    createInvoice(fixture.db, q.id, latest.version, "FULL"),
    /latest quotation/,
  );
});
