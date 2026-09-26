import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database";
import { quote } from "./fixtures";
import { newLine, jakartaDate } from "../lib/domain/model";
import {
  saveQuotation,
  getQuotation,
  changeStatus,
} from "../lib/server/repository";
import {
  duplicateQuotation,
  addFollowup,
  completeFollowup,
  listFollowups,
} from "../lib/server/sales";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
});
after(async () => {
  await fixture?.close();
});
function customQuote() {
  const q = quote();
  q.lines = [
    {
      ...newLine(),
      name: "Service",
      sellingPrice: "1000000",
      cost: { ...newLine().cost, amount: "0" },
    },
  ];
  return q;
}
test("duplicate creates an independent draft and refreshes dates without mutating the original", async () => {
  const original = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: customQuote(),
  });
  await changeStatus(fixture.db, original.id, 1, "SENT");
  const copied = await duplicateQuotation(fixture.db, original.id, 2);
  assert.notEqual(copied.seriesId, original.seriesId);
  assert.equal(copied.status, "DRAFT");
  assert.equal(copied.revision, 1);
  assert.equal(copied.data.date, jakartaDate());
  assert.equal(copied.data.eventDate, "");
  assert.notEqual(copied.data.lines[0].id, original.data.lines[0].id);
  assert.deepEqual(copied.data.company, original.data.company);
  assert.deepEqual(copied.data.bankDefaults, original.data.bankDefaults);
  assert.equal(copied.data.lines[0].sellingPrice, "1000000");
  assert.deepEqual(
    (await getQuotation(fixture.db, original.id))!.data,
    original.data,
  );
  await assert.rejects(
    duplicateQuotation(fixture.db, original.id, 1),
    /Reload/,
  );
});
test("follow-ups persist across quotation revisions and support completion and reopening", async () => {
  const q = await saveQuotation(fixture.db, {
    id: null,
    version: null,
    data: customQuote(),
  });
  const task = await addFollowup(fixture.db, {
    seriesId: q.seriesId,
    dueDate: "2026-09-30",
    note: "Call customer about proposal",
  });
  await changeStatus(fixture.db, q.id, 1, "SENT");
  const revision = await saveQuotation(fixture.db, {
    id: q.id,
    version: 2,
    data: { ...q.data, event: "Updated offer" },
  });
  assert.equal(revision.seriesId, task.seriesId);
  assert.equal((await listFollowups(fixture.db))[0].note, task.note);
  assert.equal((await completeFollowup(fixture.db, task.id, true)).done, true);
  assert.equal(
    (await completeFollowup(fixture.db, task.id, false)).done,
    false,
  );
  assert.ok(!JSON.stringify(revision.data).includes(task.note));
  await assert.rejects(
    addFollowup(fixture.db, {
      seriesId: q.seriesId,
      dueDate: "2026-02-30",
      note: "Call",
    }),
  );
  await assert.rejects(
    addFollowup(fixture.db, {
      seriesId: q.seriesId,
      dueDate: "2026-09-30",
      note: " ",
    }),
  );
});
