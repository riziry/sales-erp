import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  applyEventDuration,
  eventDays,
  eventDateLabel,
} from "../lib/domain/event-dates";
import {
  DEFAULT_QUOTATION_NOTES,
  DEFAULT_QUOTATION_TERMS,
  defaultProfile,
  newQuotation,
  quotationSchema,
  newLine,
} from "../lib/domain/model";
import { calculate, customerDocument } from "../lib/domain/calculate";
import { quote } from "./fixtures";
import { testDatabase } from "./database";
import {
  saveQuotation,
  getQuotation,
  changeStatus,
} from "../lib/server/repository";
import { createInvoice, getInvoice } from "../lib/server/invoices";
import { duplicateQuotation } from "../lib/server/sales";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
});
after(async () => {
  await fixture?.close();
});

test("event ranges count inclusive dates across months, years, leap days, and DST", () => {
  for (const [start, end, expected] of [
    ["2026-09-26", "2026-09-26", 1],
    ["2026-09-26", "", 1],
    ["2026-09-30", "2026-10-02", 3],
    ["2026-12-31", "2027-01-02", 3],
    ["2028-02-28", "2028-03-01", 3],
    ["2026-03-07", "2026-03-09", 3],
  ] as const)
    assert.equal(eventDays(start, end), expected);
  for (const [start, end] of [
    ["", ""],
    ["", "2026-10-02"],
    ["2026-02-30", ""],
    ["2026-10-02", "2026-10-01"],
  ])
    assert.equal(eventDays(start, end), null);
  assert.equal(eventDateLabel("2026-09-26"), "2026-09-26");
});
test("validation accepts old single-day quotations and rejects malformed or reversed ranges", () => {
  const data = quote();
  data.eventDate = "2026-09-26";
  delete data.eventEndDate;
  assert.equal(quotationSchema.safeParse(data).success, true);
  assert.equal(customerDocument(data).eventEndDate, "");
  data.eventEndDate = "2026-09-28";
  assert.equal(quotationSchema.safeParse(data).success, true);
  for (const end of ["2026-09-25", "2026-02-30", "invalid"]) {
    assert.equal(
      quotationSchema.safeParse({ ...data, eventEndDate: end }).success,
      false,
    );
  }
  assert.equal(
    quotationSchema.safeParse({ ...data, eventDate: "" }).success,
    false,
  );
});
test("applying event duration updates daily selling and costing independently, including package costs", () => {
  const data = quote();
  const dailySale = {
    ...data.lines[0],
    cost: { ...data.lines[0].cost, basis: "ONE_TIME" as const },
  };
  const onceSale = {
    ...data.lines[0],
    id: crypto.randomUUID(),
    sellingBasis: "ONE_TIME" as const,
  };
  const once = {
    ...onceSale,
    id: crypto.randomUUID(),
    cost: { ...onceSale.cost, basis: "ONE_TIME" as const },
  };
  const bundle = {
    ...newLine(),
    type: "PACKAGE" as const,
    sellingBasis: "ONE_TIME" as const,
    duration: "9",
    components: [
      { ...data.lines[0], id: crypto.randomUUID(), itemId: null },
      { ...once, id: crypto.randomUUID(), itemId: null },
    ],
  };
  const lines = [dailySale, onceSale, once, bundle];
  const updated = applyEventDuration(lines, 3);
  assert.deepEqual(
    updated.map((line) => line.duration),
    ["3", "3", "2", "9"],
  );
  assert.deepEqual(
    updated[3].components.map((part) => part.duration),
    ["3", "2"],
  );
  assert.equal(lines[0].duration, "2");
  assert.throws(() => applyEventDuration(lines, 0));
  assert.throws(() => applyEventDuration(lines, 1.5));
  const originalCost = calculate({ ...data, lines: [dailySale] }).cost;
  assert.equal(calculate({ ...data, lines: [updated[0]] }).cost, originalCost);
});
test("new quotations have the exact English terms, without rewriting saved wording", async () => {
  const fresh = newQuotation(defaultProfile);
  assert.equal(
    fresh.notes,
    "Upon acceptance of this quotation, please sign and return a copy to us, either in hard copy or electronic format.\nThis quotation is valid until the date shown.",
  );
  assert.equal(
    fresh.terms,
    "Payment Terms: A 50% Down Payment (DP) is required to confirm the booking. The remaining 50% balance shall be settled upon completion of the event, after equipment dismantling/load-out.\n\nEquipment Damage: Any damage to the equipment caused by the customer’s negligence, misuse, or improper handling shall be the full responsibility of the Customer.",
  );
  assert.equal(fresh.notes, DEFAULT_QUOTATION_NOTES);
  assert.equal(fresh.terms, DEFAULT_QUOTATION_TERMS);
  const data = {
    ...quote(),
    eventDate: "2026-09-30",
    eventEndDate: "2026-10-02",
    notes: "Previously agreed notes",
    terms: "Previously agreed terms",
  };
  const saved = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data,
  });
  await changeStatus(fixture.db, saved.id, saved.version, "SENT");
  const sent = (await getQuotation(fixture.db, saved.id))!;
  const invoice = await createInvoice(
    fixture.db,
    sent.id,
    sent.version,
    "FULL",
  );
  const revised = await saveQuotation(fixture.db, {
    id: sent.id,
    version: sent.version,
    data: { ...data, eventEndDate: "2026-10-05" },
  });
  assert.equal(revised.data.eventEndDate, "2026-10-05");
  assert.equal(
    (await getQuotation(fixture.db, sent.id))!.data.eventEndDate,
    "2026-10-02",
  );
  const doc = (await getInvoice(fixture.db, invoice.id))!.document;
  assert.equal(doc.eventEndDate, "2026-10-02");
  assert.equal(doc.notes, data.notes);
  assert.equal(doc.terms, data.terms);
  const duplicate = await duplicateQuotation(
    fixture.db,
    revised.id,
    revised.version,
  );
  const copy = (await getQuotation(fixture.db, duplicate.id))!;
  assert.equal(copy.data.eventDate, "");
  assert.equal(copy.data.eventEndDate, "");
});
