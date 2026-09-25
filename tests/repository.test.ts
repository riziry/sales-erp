import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { testDatabase } from "./database";
import { quote, item } from "./fixtures";
import {
  catalog,
  changeStatus,
  getQuotation,
  listQuotations,
  profile,
  saveMaster,
  saveProfile,
  saveQuotation,
} from "../lib/server/repository";
import { quotations, items, vendorPrices, vendors } from "../lib/db/schema";
import {
  hashPassword,
  tokenHash,
  verifyPassword,
} from "../lib/server/password";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
  await fixture.db
    .insert(items)
    .values({ id: item.id, name: item.name, sku: item.sku, data: item });
  await fixture.db.insert(vendors).values({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Vendor B PRIVATE",
    data: {
      name: "Vendor B PRIVATE",
      contact: "",
      address: "",
      email: "",
      notes: "",
      active: true,
    },
  });
  const p = {
    itemId: item.id,
    vendorId: "22222222-2222-4222-8222-222222222222",
    price: "175000",
    unit: "unit",
    basis: "DAILY" as const,
    notes: "",
    active: true,
  };
  await fixture.db.insert(vendorPrices).values({
    id: "33333333-3333-4333-8333-333333333333",
    itemId: item.id,
    vendorId: p.vendorId,
    data: p,
  });
});
after(async () => {
  await fixture?.close();
});
test("concurrent saves allocate unique quotation numbers transactionally", async () => {
  const saved = await Promise.all(
    Array.from({ length: 8 }, () =>
      saveQuotation(fixture.db, { id: null, version: null, data: quote() }),
    ),
  );
  assert.equal(new Set(saved.map((s) => s.seriesId)).size, 8);
  const list = await listQuotations(fixture.db);
  assert.equal(new Set(list.map((s) => s.number)).size, 8);
  assert.ok(list.every((s) => /^QTT\/2026\/\d{4}$/.test(s.number)));
});
test("draft edits, conflict detection, status changes, and revisions preserve previous versions", async () => {
  const original = quote();
  let q = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: original,
  });
  const edited = structuredClone(original);
  edited.lines[0].name = "Custom name";
  edited.lines[0].quantity = "50";
  q = await saveQuotation(fixture.db, {
    id: q.id,
    version: q.version,
    data: edited,
  });
  assert.equal(q.version, 2);
  assert.equal(q.revision, 1);
  await assert.rejects(
    saveQuotation(fixture.db, { id: q.id, version: 1, data: original }),
    /another tab/,
  );
  await assert.rejects(
    changeStatus(fixture.db, q.id, q.version, "APPROVED"),
    /not allowed/,
  );
  await changeStatus(fixture.db, q.id, q.version, "SENT");
  let sent = (await getQuotation(fixture.db, q.id))!;
  await changeStatus(fixture.db, q.id, sent.version, "APPROVED");
  sent = (await getQuotation(fixture.db, q.id))!;
  edited.lines[0].name = "New revision";
  const revised = await saveQuotation(fixture.db, {
    id: q.id,
    version: sent.version,
    data: edited,
  });
  assert.equal(revised.revision, 2);
  assert.equal(revised.status, "DRAFT");
  const old = (await getQuotation(fixture.db, q.id))!;
  assert.equal(old.data.lines[0].name, "Custom name");
  assert.equal(old.status, "APPROVED");
  assert.equal(old.history.length, 2);
  await assert.rejects(
    saveQuotation(fixture.db, {
      id: q.id,
      version: old.version,
      data: original,
    }),
    /latest revision/,
  );
  const latest = await listQuotations(fixture.db);
  assert.ok(latest.some((l) => l.id === revised.id));
  assert.ok(!latest.some((l) => l.id === q.id));
});
test("unknown costs and empty quotations cannot be sent; explicit zero costs are valid", async () => {
  const data = quote();
  data.lines[0].cost.amount = null;
  let q = await saveQuotation(fixture.db, { id: null, version: null, data });
  await assert.rejects(
    changeStatus(fixture.db, q.id, q.version, "SENT"),
    /complete/,
  );
  data.lines[0].cost.amount = "0";
  data.lines[0].cost.source = "CUSTOM";
  q = await saveQuotation(fixture.db, { id: q.id, version: q.version, data });
  await changeStatus(fixture.db, q.id, q.version, "SENT");
  data.lines = [];
  q = await saveQuotation(fixture.db, { id: null, version: null, data });
  await assert.rejects(
    changeStatus(fixture.db, q.id, q.version, "SENT"),
    /Add items/,
  );
});
test("master and profile changes or deactivation do not alter quotation snapshots", async () => {
  const q = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: quote(),
  });
  const p = await profile(fixture.db);
  p.name = "New profile";
  p.ppnRate = "12";
  p.regularBank.number = "NEW_BANK";
  await saveProfile(fixture.db, p);
  await saveMaster(fixture.db, "items", item.id, {
    ...item,
    name: "New item",
    sellingPrice: "999",
    active: false,
  });
  const c = await catalog(fixture.db);
  assert.equal(c.items.find((i) => i.id === item.id)?.active, false);
  const saved = (await getQuotation(fixture.db, q.id))!;
  assert.equal(saved.data.lines[0].name, "PAR LED 54 RGBW");
  assert.equal(saved.data.lines[0].sellingPrice, "350000");
  assert.equal(saved.data.ppnRate, "11");
  assert.equal(saved.data.company.name, "YW Production");
});
test("unique SKUs, vendor pricing, and packages persist; invalid references are rejected", async () => {
  await assert.rejects(saveMaster(fixture.db, "items", null, item));
  const packId = await saveMaster(fixture.db, "packages", null, {
    name: "10,000 Watt Sound System",
    description: "",
    sellingPrice: "10000000",
    sellingBasis: "DAILY",
    active: true,
    components: [{ itemId: item.id, quantity: "4" }],
  });
  assert.ok((await catalog(fixture.db)).packages.some((p) => p.id === packId));
  await assert.rejects(
    saveMaster(fixture.db, "packages", null, {
      name: "Invalid",
      description: "",
      sellingPrice: "1",
      sellingBasis: "DAILY",
      active: true,
      components: [{ itemId: crypto.randomUUID(), quantity: "1" }],
    }),
    /not found/,
  );
});
test("concurrent revision requests create exactly one subsequent revision", async () => {
  const q = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: quote(),
  });
  await changeStatus(fixture.db, q.id, q.version, "SENT");
  const sent = (await getQuotation(fixture.db, q.id))!;
  const results = await Promise.allSettled([
    saveQuotation(fixture.db, {
      id: q.id,
      version: sent.version,
      data: quote(),
    }),
    saveQuotation(fixture.db, {
      id: q.id,
      version: sent.version,
      data: quote(),
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rows = await fixture.db
    .select()
    .from(quotations)
    .where(eq(quotations.seriesId, q.seriesId));
  assert.equal(rows.length, 2);
});
test("password hashes use salts and verification; session tokens are never stored as plaintext", () => {
  const a = hashPassword("long-internal-password");
  const b = hashPassword("long-internal-password");
  assert.notEqual(a, b);
  assert.ok(verifyPassword("long-internal-password", a));
  assert.ok(!verifyPassword("wrong", a));
  assert.notEqual(tokenHash("token"), "token");
  assert.equal(tokenHash("token").length, 64);
});
