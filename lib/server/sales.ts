import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { followups, quotationSeries } from "../db/schema";
import { jakartaDate } from "../domain/model";
import { getQuotation, saveQuotation } from "./repository";

const followupSchema = z.object({
  seriesId: z.uuid(),
  note: z
    .string()
    .trim()
    .min(1, "Enter a next step for this customer.")
    .max(2000),
  dueDate: z.iso.date(),
});
export async function listFollowups(db: Database) {
  return db
    .select()
    .from(followups)
    .orderBy(
      asc(followups.done),
      asc(followups.dueDate),
      asc(followups.createdAt),
    );
}
export async function addFollowup(db: Database, input: unknown) {
  const data = followupSchema.parse(input);
  const [series] = await db
    .select({ id: quotationSeries.id })
    .from(quotationSeries)
    .where(eq(quotationSeries.id, data.seriesId));
  if (!series) throw new Error("Quotation not found.");
  const [saved] = await db.insert(followups).values(data).returning();
  return saved;
}
export async function completeFollowup(
  db: Database,
  id: string,
  done: boolean,
) {
  z.uuid().parse(id);
  z.boolean().parse(done);
  const [saved] = await db
    .update(followups)
    .set({ done })
    .where(eq(followups.id, id))
    .returning();
  if (!saved) throw new Error("Follow-up not found. Refresh this page.");
  return saved;
}
export async function duplicateQuotation(
  db: Database,
  id: string,
  version: number,
) {
  const original = await getQuotation(db, id);
  if (!original || original.version !== version)
    throw new Error("This quotation changed. Reload before duplicating it.");
  const data = structuredClone(original.data);
  data.event = `Copy of ${data.event}`.slice(0, 250);
  data.date = jakartaDate();
  const expiry = new Date(`${data.date}T12:00:00+07:00`);
  expiry.setUTCDate(expiry.getUTCDate() + 14);
  data.validUntil = jakartaDate(expiry);
  data.eventDate = "";
  data.lines = data.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    components: line.components.map((part) => ({
      ...part,
      id: crypto.randomUUID(),
    })),
  }));
  return saveQuotation(db, { id: null, version: null, data });
}
