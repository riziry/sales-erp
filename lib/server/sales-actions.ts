"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database } from "../db";
import { requireUser } from "./auth";
import { addFollowup, completeFollowup, duplicateQuotation } from "./sales";
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
  return error instanceof Error && !error.message.startsWith("Failed query:")
    ? error.message
    : "Unable to save. Please try again.";
}
export async function addFollowupAction(input: {
  seriesId: string;
  dueDate: string;
  note: string;
}) {
  await requireUser();
  try {
    await addFollowup(database(), input);
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function completeFollowupAction(id: string, done: boolean) {
  await requireUser();
  try {
    await completeFollowup(database(), id, done);
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function duplicateQuotationAction(id: string, version: number) {
  await requireUser();
  try {
    const saved = await duplicateQuotation(database(), id, version);
    revalidatePath("/quotation", "layout");
    revalidatePath("/sales");
    return { ok: true as const, id: saved.id };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
