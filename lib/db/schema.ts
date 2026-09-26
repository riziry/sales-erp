import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type {
  Item,
  Contact,
  Customer,
  Package,
  Profile,
  Quotation,
  VendorPrice,
  Status,
} from "../domain/model";
const identity = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});
export const items = pgTable("items", {
  ...identity(),
  sku: text("sku").notNull().unique(),
  externalInventoryItemId: text("external_inventory_item_id"),
  data: jsonb("data").$type<Item>().notNull(),
}).enableRLS();
export const vendors = pgTable("vendors", {
  ...identity(),
  data: jsonb("data").$type<Contact>().notNull(),
}).enableRLS();
export const customers = pgTable("customers", {
  ...identity(),
  data: jsonb("data").$type<Customer>().notNull(),
}).enableRLS();
export const vendorPrices = pgTable("vendor_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id),
  active: boolean("active").notNull().default(true),
  data: jsonb("data").$type<VendorPrice>().notNull(),
}).enableRLS();
export const packages = pgTable("packages", {
  ...identity(),
  data: jsonb("data").$type<Package>().notNull(),
}).enableRLS();
export const profiles = pgTable("profiles", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<Profile>().notNull(),
}).enableRLS();
export const users = pgTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
}).enableRLS();
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}).enableRLS();
export const counters = pgTable("quotation_counters", {
  year: integer("year").primaryKey(),
  value: integer("value").notNull(),
}).enableRLS();
export const quotationSeries = pgTable("quotation_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  latestRevision: integer("latest_revision").notNull().default(1),
}).enableRLS();
export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => quotationSeries.id),
    revision: integer("revision").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status", { enum: ["DRAFT", "SENT", "APPROVED", "REJECTED"] })
      .$type<Status>()
      .notNull()
      .default("DRAFT"),
    data: jsonb("data").$type<Quotation>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("quotation_revision_unique").on(t.seriesId, t.revision),
    index("quotation_status_idx").on(t.status),
  ],
).enableRLS();

export const invoiceCounters = pgTable("invoice_counters", {
  year: integer("year").primaryKey(),
  value: integer("value").notNull(),
}).enableRLS();
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => quotationSeries.id),
    quotationId: uuid("quotation_id")
      .notNull()
      .references(() => quotations.id),
    quotationNumber: text("quotation_number").notNull(),
    quotationRevision: integer("quotation_revision").notNull(),
    kind: text("kind", { enum: ["FULL", "DEPOSIT", "FINAL"] }).notNull(),
    status: text("status", { enum: ["DRAFT", "ISSUED", "VOID"] })
      .notNull()
      .default("DRAFT"),
    version: integer("version").notNull().default(1),
    document: jsonb("document")
      .$type<import("../domain/calculate").CustomerDocument>()
      .notNull(),
    details: jsonb("details")
      .$type<import("../domain/invoice").InvoiceDetails>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_series_idx").on(table.seriesId),
    index("invoice_status_idx").on(table.status),
    uniqueIndex("invoice_active_kind_unique")
      .on(table.seriesId, table.kind)
      .where(sql`${table.status} <> 'VOID'`),
  ],
).enableRLS();

// Internal sales tasks belong to the quotation series, never to customer documents.
export const followups = pgTable(
  "quotation_followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => quotationSeries.id),
    note: text("note").notNull(),
    dueDate: text("due_date").notNull(),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("followup_due_idx").on(table.done, table.dueDate)],
).enableRLS();

export const accountProfiles = pgTable("account_profiles", {
  role: text("role").notNull().default(""),
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  signature: text("signature"),
  version: integer("version").notNull().default(1),
}).enableRLS();
