"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database } from "../db";
import { requireUser } from "./auth";
import { createInvoice, saveInvoice, setInvoiceStatus } from "./invoices";
import type { InvoiceDetails, InvoiceKind } from "../domain/invoice";
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues.map((issue) => issue.message).join("\n");
  if (
    error instanceof Error &&
    !error.message.startsWith("Failed query:") &&
    !("code" in error)
  )
    return error.message;
  return "Unable to save the invoice. Check the connection and try again.";
}
function refresh() {
  revalidatePath("/invoice", "layout");
  revalidatePath("/quotation", "layout");
}
export async function createInvoiceAction(
  id: string,
  version: number,
  kind: InvoiceKind,
) {
  await requireUser();
  try {
    const saved = await createInvoice(database(), id, version, kind);
    refresh();
    return { ok: true as const, id: saved.id };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function saveInvoiceAction(
  id: string,
  version: number,
  details: InvoiceDetails,
) {
  await requireUser();
  try {
    await saveInvoice(database(), id, version, details);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function invoiceStatusAction(
  id: string,
  version: number,
  status: "ISSUED" | "VOID",
) {
  await requireUser();
  try {
    await setInvoiceStatus(database(), id, version, status);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
