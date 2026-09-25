import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import * as s from "../db/schema";
import { customerDocument } from "../domain/calculate";
import {
  invoiceDetails,
  invoiceDetailsSchema,
  invoiceKindSchema,
  type InvoiceDetails,
  type InvoiceKind,
} from "../domain/invoice";
export type Invoice = typeof s.invoices.$inferSelect;
export async function getInvoice(db: Database, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (
    (await db.select().from(s.invoices).where(eq(s.invoices.id, id)))[0] || null
  );
}
export async function listInvoices(db: Database) {
  return db.select().from(s.invoices).orderBy(desc(s.invoices.createdAt));
}
export async function quotationInvoices(db: Database, seriesId: string) {
  return db
    .select()
    .from(s.invoices)
    .where(eq(s.invoices.seriesId, seriesId))
    .orderBy(desc(s.invoices.createdAt));
}
export async function createInvoice(
  db: Database,
  quotationId: string,
  version: number,
  kind: InvoiceKind,
) {
  z.uuid().parse(quotationId);
  z.number().int().positive().parse(version);
  invoiceKindSchema.parse(kind);
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(s.quotations)
      .where(eq(s.quotations.id, quotationId))
      .for("update");
    if (!source) throw new Error("Quotation not found");
    const [series] = await tx
      .select()
      .from(s.quotationSeries)
      .where(eq(s.quotationSeries.id, source.seriesId))
      .for("update");
    const active = await tx
      .select()
      .from(s.invoices)
      .where(
        and(eq(s.invoices.seriesId, series.id), ne(s.invoices.status, "VOID")),
      );
    // Repeated clicks return the existing invoice without consuming a number.
    const same = active.find((invoice) => invoice.kind === kind);
    if (same) return same;
    if (
      active.some((invoice) => invoice.kind === "FULL") ||
      (kind === "FULL" && active.length)
    )
      throw new Error(
        "This quotation already has a billing plan. Use its existing invoices or void them before changing the plan.",
      );
    if (
      kind === "FINAL" &&
      !active.some((invoice) => invoice.kind === "DEPOSIT")
    )
      throw new Error(
        "Create the down payment invoice before the final installment.",
      );
    if (source.version !== version)
      throw new Error(
        "The quotation changed. Reload before creating an invoice.",
      );
    if (!active.length && source.revision !== series.latestRevision)
      throw new Error(
        "Open the latest quotation revision to create an invoice.",
      );
    if (source.status === "REJECTED")
      throw new Error("A rejected quotation cannot be invoiced.");
    if (!source.data.lines.length)
      throw new Error(
        "Add and save at least one quotation item before creating an invoice.",
      );
    // Both installments share the first invoice's commercial snapshot even if
    // the quotation is revised later. Never copy internal costing into invoices.
    const first = active[0];
    const document = first
      ? structuredClone(first.document)
      : customerDocument(source.data);
    const details = invoiceDetails(document);
    const year = Number(details.date.slice(0, 4));
    const [counter] = await tx
      .insert(s.invoiceCounters)
      .values({ year, value: 1 })
      .onConflictDoUpdate({
        target: s.invoiceCounters.year,
        set: { value: sql`${s.invoiceCounters.value} + 1` },
      })
      .returning();
    const [invoice] = await tx
      .insert(s.invoices)
      .values({
        number: `INV/${year}/${String(counter.value).padStart(4, "0")}`,
        seriesId: series.id,
        quotationId: first?.quotationId || source.id,
        quotationNumber: first?.quotationNumber || series.number,
        quotationRevision: first?.quotationRevision || source.revision,
        kind,
        document,
        details,
      })
      .returning();
    return invoice;
  });
}
export async function saveInvoice(
  db: Database,
  id: string,
  version: number,
  input: InvoiceDetails,
) {
  z.uuid().parse(id);
  z.number().int().positive().parse(version);
  const details = invoiceDetailsSchema.parse(input);
  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(s.invoices)
      .where(eq(s.invoices.id, id))
      .for("update");
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.version !== version)
      throw new Error(
        "This invoice changed in another tab. Reload before saving.",
      );
    if (invoice.status !== "DRAFT")
      throw new Error(
        "Only draft invoices can be edited. Issued invoices are preserved.",
      );
    const [saved] = await tx
      .update(s.invoices)
      .set({ details, version: invoice.version + 1, updatedAt: new Date() })
      .where(eq(s.invoices.id, id))
      .returning();
    return saved;
  });
}
export async function setInvoiceStatus(
  db: Database,
  id: string,
  version: number,
  status: "ISSUED" | "VOID",
) {
  z.uuid().parse(id);
  z.number().int().positive().parse(version);
  z.enum(["ISSUED", "VOID"]).parse(status);
  return db.transaction(async (tx) => {
    const [identity] = await tx
      .select({ seriesId: s.invoices.seriesId })
      .from(s.invoices)
      .where(eq(s.invoices.id, id));
    if (!identity) throw new Error("Invoice not found");
    // Consistent series-first locking serializes invoice creation and voiding.
    await tx
      .select()
      .from(s.quotationSeries)
      .where(eq(s.quotationSeries.id, identity.seriesId))
      .for("update");
    const [invoice] = await tx
      .select()
      .from(s.invoices)
      .where(eq(s.invoices.id, id))
      .for("update");
    if (invoice.version !== version)
      throw new Error(
        "This invoice changed in another tab. Reload before continuing.",
      );
    if (
      invoice.status === "VOID" ||
      (status === "ISSUED" && invoice.status !== "DRAFT")
    )
      throw new Error("This invoice status change is not allowed.");
    if (status === "VOID" && invoice.kind === "DEPOSIT") {
      const [final] = await tx
        .select({ id: s.invoices.id })
        .from(s.invoices)
        .where(
          and(
            eq(s.invoices.seriesId, invoice.seriesId),
            eq(s.invoices.kind, "FINAL"),
            ne(s.invoices.status, "VOID"),
          ),
        );
      if (final)
        throw new Error(
          "Void the final installment first, then void the down payment invoice.",
        );
    }
    invoiceDetailsSchema.parse(invoice.details);
    const [saved] = await tx
      .update(s.invoices)
      .set({ status, version: invoice.version + 1, updatedAt: new Date() })
      .where(eq(s.invoices.id, id))
      .returning();
    return saved;
  });
}
