import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db";
import * as s from "../db/schema";
import { calculate } from "../domain/calculate";
import {
  defaultProfile,
  masterSchemas,
  profileSchema,
  quotationSchema,
  type Catalog,
  type MasterKind,
  type Profile,
  type Quotation,
  type Status,
} from "../domain/model";
import { z } from "zod";

export async function catalog(db: Database): Promise<Catalog> {
  const [items, vendors, customers, prices, packages] = await Promise.all([
    db.select().from(s.items),
    db.select().from(s.vendors),
    db.select().from(s.customers),
    db.select().from(s.vendorPrices),
    db.select().from(s.packages),
  ]);
  const unpack = <T>(rows: { id: string; data: T }[]) =>
    rows.map((r) => ({ ...r.data, id: r.id }));
  return {
    items: unpack(items),
    vendors: unpack(vendors),
    customers: unpack(customers),
    prices: unpack(prices),
    packages: unpack(packages),
  };
}
export async function profile(db: Database) {
  return (
    (await db.select().from(s.profiles).where(eq(s.profiles.id, 1)))[0]?.data ??
    structuredClone(defaultProfile)
  );
}
export async function saveProfile(db: Database, input: Profile) {
  const data = profileSchema.parse(input);
  await db
    .insert(s.profiles)
    .values({ id: 1, data })
    .onConflictDoUpdate({ target: s.profiles.id, set: { data } });
}
export async function saveMaster(
  db: Database,
  kind: MasterKind,
  id: string | null,
  input: unknown,
) {
  if (id) z.uuid().parse(id);
  const entityId = id || crypto.randomUUID();
  // Every save validates at the server boundary; the client is never trusted.
  if (kind === "items") {
    const data = masterSchemas.items.parse(input);
    const values = {
      name: data.name,
      active: data.active,
      sku: data.sku,
      externalInventoryItemId: data.externalInventoryItemId || null,
      data,
    };
    if (id) await db.update(s.items).set(values).where(eq(s.items.id, id));
    else await db.insert(s.items).values({ id: entityId, ...values });
  } else if (kind === "vendors" || kind === "customers") {
    const data = masterSchemas[kind].parse(input);
    const table = kind === "vendors" ? s.vendors : s.customers;
    const values = { name: data.name, active: data.active, data };
    if (id) await db.update(table).set(values).where(eq(table.id, id));
    else await db.insert(table).values({ id: entityId, ...values });
  } else if (kind === "prices") {
    const data = masterSchemas.prices.parse(input);
    const c = await catalog(db);
    if (
      !c.items.some((i) => i.id === data.itemId) ||
      !c.vendors.some((v) => v.id === data.vendorId)
    )
      throw new Error("Item or vendor not found");
    const values = {
      itemId: data.itemId,
      vendorId: data.vendorId,
      active: data.active,
      data,
    };
    if (id)
      await db
        .update(s.vendorPrices)
        .set(values)
        .where(eq(s.vendorPrices.id, id));
    else await db.insert(s.vendorPrices).values({ id: entityId, ...values });
  } else {
    const data = masterSchemas.packages.parse(input);
    const c = await catalog(db);
    if (
      data.components.some((part) => !c.items.some((i) => i.id === part.itemId))
    )
      throw new Error("Package component not found");
    const values = { name: data.name, active: data.active, data };
    if (id)
      await db.update(s.packages).set(values).where(eq(s.packages.id, id));
    else await db.insert(s.packages).values({ id: entityId, ...values });
  }
  return entityId;
}
export async function listQuotations(db: Database) {
  return db
    .select({
      id: s.quotations.id,
      seriesId: s.quotations.seriesId,
      version: s.quotations.version,
      number: s.quotationSeries.number,
      revision: s.quotations.revision,
      status: s.quotations.status,
      data: s.quotations.data,
      updatedAt: s.quotations.updatedAt,
    })
    .from(s.quotations)
    .innerJoin(
      s.quotationSeries,
      and(
        eq(s.quotationSeries.id, s.quotations.seriesId),
        eq(s.quotationSeries.latestRevision, s.quotations.revision),
      ),
    )
    .orderBy(desc(s.quotations.updatedAt));
}
export async function getQuotation(db: Database, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const rows = await db
    .select({
      quote: s.quotations,
      number: s.quotationSeries.number,
      latestRevision: s.quotationSeries.latestRevision,
    })
    .from(s.quotations)
    .innerJoin(
      s.quotationSeries,
      eq(s.quotationSeries.id, s.quotations.seriesId),
    )
    .where(eq(s.quotations.id, id));
  if (!rows[0]) return null;
  const row = rows[0];
  const history = await db
    .select({
      id: s.quotations.id,
      revision: s.quotations.revision,
      status: s.quotations.status,
    })
    .from(s.quotations)
    .where(eq(s.quotations.seriesId, row.quote.seriesId))
    .orderBy(desc(s.quotations.revision));
  return {
    ...row.quote,
    number: row.number,
    latestRevision: row.latestRevision,
    history,
  };
}
function validateSources(q: Quotation) {
  for (const line of q.lines)
    for (const part of line.type === "PACKAGE" ? line.components : [line]) {
      if (
        part.cost.source === "VENDOR" &&
        (!part.cost.vendorId ||
          !part.cost.vendorPriceId ||
          !part.cost.vendorName)
      )
        throw new Error("Select a recorded vendor price or use a custom cost");
      if (part.cost.source === "INTERNAL" && !part.itemId)
        throw new Error("Internal cost is only available for master items");
      if (part.cost.unit !== part.unit)
        throw new Error(
          `Unit Cost ${part.name} must match the item unit; use a custom cost for unit conversions`,
        );
    }
}
export async function saveQuotation(
  db: Database,
  input: { id: string | null; version: number | null; data: Quotation },
) {
  const data = quotationSchema.parse(input.data);
  calculate(data);
  validateSources(data);
  if (data.bankMode === "AUTO")
    data.bank = structuredClone(
      data.ppnEnabled ? data.bankDefaults.tax : data.bankDefaults.regular,
    );
  return db.transaction(async (tx) => {
    if (!input.id) {
      const year = Number(data.date.slice(0, 4));
      const [counter] = await tx
        .insert(s.counters)
        .values({ year, value: 1 })
        .onConflictDoUpdate({
          target: s.counters.year,
          set: { value: sql`${s.counters.value} + 1` },
        })
        .returning();
      const number = `QTT/${year}/${String(counter.value).padStart(4, "0")}`;
      const [series] = await tx
        .insert(s.quotationSeries)
        .values({ number })
        .returning();
      const [saved] = await tx
        .insert(s.quotations)
        .values({ seriesId: series.id, revision: 1, data })
        .returning();
      return saved;
    }
    z.uuid().parse(input.id);
    const [existing] = await tx
      .select()
      .from(s.quotations)
      .where(eq(s.quotations.id, input.id))
      .for("update");
    if (!existing) throw new Error("Quotation not found");
    if (existing.version !== input.version)
      throw new Error(
        "This document was changed in another tab. Reload before saving.",
      );
    const [series] = await tx
      .select()
      .from(s.quotationSeries)
      .where(eq(s.quotationSeries.id, existing.seriesId))
      .for("update");
    if (existing.revision !== series.latestRevision)
      throw new Error("Open the latest revision to edit the quotation");
    if (existing.status === "DRAFT") {
      const [saved] = await tx
        .update(s.quotations)
        .set({ data, version: existing.version + 1, updatedAt: new Date() })
        .where(eq(s.quotations.id, existing.id))
        .returning();
      return saved;
    }
    const revision = series.latestRevision + 1;
    await tx
      .update(s.quotationSeries)
      .set({ latestRevision: revision })
      .where(eq(s.quotationSeries.id, series.id));
    const [saved] = await tx
      .insert(s.quotations)
      .values({ seriesId: series.id, revision, data })
      .returning();
    return saved;
  });
}
export async function changeStatus(
  db: Database,
  id: string,
  version: number,
  status: Status,
) {
  z.uuid().parse(id);
  z.enum(["SENT", "APPROVED", "REJECTED"]).parse(status);
  return db.transaction(async (tx) => {
    const [q] = await tx
      .select()
      .from(s.quotations)
      .where(eq(s.quotations.id, id))
      .for("update");
    if (!q || q.version !== version)
      throw new Error(
        "The document changed or could not be found. Please reload.",
      );
    const [series] = await tx
      .select()
      .from(s.quotationSeries)
      .where(eq(s.quotationSeries.id, q.seriesId))
      .for("update");
    if (q.revision !== series.latestRevision)
      throw new Error("Only the latest revision can change status");
    if (!(
      (q.status === "DRAFT" && status === "SENT") ||
      (q.status === "SENT" && ["APPROVED", "REJECTED"].includes(status))
    ))
      throw new Error("This status change is not allowed");
    const totals = calculate(q.data);
    if (!q.data.lines.length || !totals.complete)
      throw new Error(
        "Add items and complete all costs before marking as sent",
      );
    await tx
      .update(s.quotations)
      .set({ status, version: q.version + 1, updatedAt: new Date() })
      .where(eq(s.quotations.id, id));
  });
}
