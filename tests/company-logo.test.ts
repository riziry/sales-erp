import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { testDatabase } from "./database";
import { normalizeDocumentImage } from "../lib/server/document-images";
import {
  defaultProfile,
  newQuotation,
  profileSchema,
  quotationSchema,
} from "../lib/domain/model";
import {
  profile,
  saveProfile,
  saveQuotation,
  getQuotation,
  changeStatus,
} from "../lib/server/repository";
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
async function logo(color: string) {
  return normalizeDocumentImage(
    await sharp({
      create: { width: 400, height: 200, channels: 4, background: color },
    })
      .png()
      .toBuffer(),
    "image/png",
  );
}
test("company logo accepts normalized PNGs, rejects URLs and preserves old documents without a logo", async () => {
  const png = await logo("blue");
  assert.equal(profileSchema.parse({ ...defaultProfile, logo: png }).logo, png);
  for (const invalid of [
    "https://example.com/logo.png",
    "data:image/svg+xml,<svg/>",
    "javascript:alert(1)",
  ]) {
    assert.equal(
      profileSchema.safeParse({ ...defaultProfile, logo: invalid }).success,
      false,
    );
  }
  const legacy = quote();
  delete legacy.company.logo;
  assert.equal(quotationSchema.safeParse(legacy).success, true);
  assert.equal(customerDocument(legacy).company.logo, null);
});
test("company logo is snapshotted on quotations, revisions and invoices, surviving replacement and removal", async () => {
  const first = await logo("blue");
  const second = await logo("red");
  await saveProfile(fixture.db, { ...defaultProfile, logo: first });
  const data = quote();
  data.company = newQuotation(await profile(fixture.db)).company;
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
  await saveProfile(fixture.db, { ...defaultProfile, logo: second });
  assert.equal(newQuotation(await profile(fixture.db)).company.logo, second);
  const revision = await saveQuotation(fixture.db, {
    id: sent.id,
    version: sent.version,
    data: { ...sent.data, event: "Revised event" },
  });
  assert.equal(revision.data.company.logo, first);
  await saveProfile(fixture.db, { ...defaultProfile, logo: null });
  assert.equal(newQuotation(await profile(fixture.db)).company.logo, null);
  assert.equal(
    (await getQuotation(fixture.db, saved.id))!.data.company.logo,
    first,
  );
  assert.equal(
    (await getInvoice(fixture.db, invoice.id))!.document.company.logo,
    first,
  );
  assert.equal(customerDocument(revision.data).company.logo, first);
});
