import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { testDatabase } from "./database";
import {
  normalizeSignature,
  saveAccountProfile,
  accountProfile,
} from "../lib/server/accounts";
import { accountSchema, salesIdentity } from "../lib/domain/account";
import { saveQuotation, getQuotation } from "../lib/server/repository";
import { createInvoice, getInvoice } from "../lib/server/invoices";
import { customerDocument } from "../lib/domain/calculate";
import { quote } from "./fixtures";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
});
after(async () => {
  await fixture?.close();
});
test("signature uploads are decoded, normalized, bounded, and reject active or invalid files", async () => {
  const png = await sharp({
    create: {
      width: 1600,
      height: 640,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const data = await normalizeSignature(png, "image/png");
  const decoded = Buffer.from(data.split(",")[1], "base64");
  const meta = await sharp(decoded).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 320);
  assert.equal(meta.exif, undefined);
  await assert.rejects(
    normalizeSignature(
      Buffer.from("<svg><script>alert(1)</script></svg>"),
      "image/png",
    ),
    /valid PNG/,
  );
  await assert.rejects(normalizeSignature(png, "image/svg+xml"), /PNG/);
  await assert.rejects(
    normalizeSignature(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"),
    /5 MB/,
  );
});
test("account saves enforce identity ownership, validation, and conflict detection", async () => {
  assert.equal(
    accountSchema.parse({
      username: "Sales.One",
      name: " Sales One ",
      phone: "+62 812 3456 7890",
    }).username,
    "sales.one",
  );
  const input = {
    username: "sales.one",
    name: "Sales One",
    phone: "+62 812 3456 7890",
  };
  const saved = await saveAccountProfile(
    fixture.db,
    "internal:1",
    input,
    0,
    null,
  );
  assert.equal(saved.version, 1);
  assert.equal(await accountProfile(fixture.db, "supabase:someone-else"), null);
  await assert.rejects(
    saveAccountProfile(fixture.db, "internal:1", input, 0, null),
    /changed/,
  );
  await assert.rejects(
    saveAccountProfile(
      fixture.db,
      "internal:1",
      { ...input, phone: "bad" },
      1,
      null,
    ),
  );
  await saveAccountProfile(fixture.db, "internal:1", input, 1, undefined);
  await assert.rejects(
    saveAccountProfile(fixture.db, "internal:1", input, 1, undefined),
    /another tab/,
  );
});
test("sales contact and signature snapshots survive account changes and stay on invoice copies", async () => {
  const png = await sharp({
    create: { width: 100, height: 30, channels: 3, background: "black" },
  })
    .png()
    .toBuffer();
  const signature = await normalizeSignature(png, "image/png");
  const account = await saveAccountProfile(
    fixture.db,
    "internal:2",
    { username: "sales.two", name: "Sales Original", phone: "081234567890" },
    0,
    signature,
  );
  const q = quote();
  q.sales = salesIdentity(account);
  const saved = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: q,
  });
  const invoice = await createInvoice(
    fixture.db,
    saved.id,
    saved.version,
    "FULL",
  );
  await saveAccountProfile(
    fixture.db,
    "internal:2",
    { username: "sales.two", name: "Sales Changed", phone: "089999999999" },
    1,
    null,
  );
  assert.deepEqual(
    (await getQuotation(fixture.db, saved.id))!.data.sales,
    q.sales,
  );
  const doc = (await getInvoice(fixture.db, invoice.id))!.document;
  assert.equal(doc.sales?.name, "Sales Original");
  assert.equal(doc.sales?.signature, signature);
  const projection = JSON.stringify(customerDocument(q));
  assert.ok(!projection.includes("sales.two"));
  assert.ok(!projection.includes("password"));
});
