import Decimal from "decimal.js";
import { z } from "zod";
import { bankSchema, jakartaDate } from "./model";
import type { CustomerDocument } from "./calculate";
export const invoiceKinds = {
  FULL: "Full payment",
  DEPOSIT: "Down payment (50%)",
  FINAL: "Final installment (50%)",
} as const;
export const invoiceStatuses = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  VOID: "Void",
} as const;
export type InvoiceKind = keyof typeof invoiceKinds;
export type InvoiceStatus = keyof typeof invoiceStatuses;
export const invoiceKindSchema = z.enum(["FULL", "DEPOSIT", "FINAL"]);
export const invoiceDetailsSchema = z
  .object({
    date: z.iso.date(),
    dueDate: z.iso.date(),
    notes: z.string().trim().max(10000),
    terms: z.string().trim().max(10000),
    bank: bankSchema,
  })
  .refine((value) => value.dueDate >= value.date, {
    path: ["dueDate"],
    message: "Due date cannot be before the invoice date",
  });
export type InvoiceDetails = z.infer<typeof invoiceDetailsSchema>;
export function invoiceDetails(document: CustomerDocument): InvoiceDetails {
  const date = jakartaDate();
  const due = new Date(`${date}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 14);
  return {
    date,
    dueDate: due.toISOString().slice(0, 10),
    notes: document.notes,
    terms: document.terms,
    bank: structuredClone(document.bank),
  };
}
// Split the inclusive total exactly. Tax shares round half-up; the net amount
// absorbs the rounding remainder. Final + deposit always equals the full bill.
export function invoiceAmounts(
  document: Pick<CustomerDocument, "net" | "ppn" | "pph" | "total">,
  kind: InvoiceKind,
) {
  const split = (value: string) => {
    const full = new Decimal(value);
    const deposit = full.div(2).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return kind === "FULL"
      ? full
      : kind === "DEPOSIT"
        ? deposit
        : full.minus(deposit);
  };
  const total = split(document.total),
    ppn = split(document.ppn),
    pph = split(document.pph);
  return {
    net: total.minus(ppn).minus(pph).toFixed(0),
    ppn: ppn.toFixed(0),
    pph: pph.toFixed(0),
    total: total.toFixed(0),
  };
}
