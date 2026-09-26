"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { eq, sql, lt } from "drizzle-orm";
import { z } from "zod";
import { database } from "../db";
import { sessions, users } from "../db/schema";
import { COOKIE, requireUser } from "./auth";
import { hashPassword, tokenHash, verifyPassword } from "./password";
import {
  authProvider,
  allowedUserId,
  isAllowedUser,
  supabaseAuthMessage,
} from "../supabase/config";
import { supabaseServer } from "../supabase/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabase/config";
import { loginFailure } from "./login-errors";
import * as repo from "./repository";
import {
  type MasterKind,
  type Profile,
  type Quotation,
  type Status,
} from "../domain/model";
function message(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
  const cause = error as { code?: string; cause?: { code?: string } };
  if (cause?.code === "23505" || cause?.cause?.code === "23505")
    return "This SKU or document number is already in use.";
  if (error instanceof Error && !error.message.startsWith("Failed query:"))
    return error.message;
  return "Unable to save. Check the database connection and try again.";
}
export async function loginAction(_: { error: string }, form: FormData) {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password || password.length > 1024)
    return { error: "Incorrect email or password." };
  if (authProvider() === "supabase") {
    try {
      allowedUserId();
      const supabase = await supabaseServer();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: supabaseAuthMessage(error) };
      if (!data.user || !isAllowedUser(data.user)) {
        await supabase.auth.signOut({ scope: "local" });
        return {
          error:
            "This account does not have access to the sales-erp workspace.",
        };
      }
    } catch (error) {
      const failure = loginFailure(error);
      console.error(
        "[login] Supabase authentication unavailable:",
        failure.code,
      );
      return { error: failure.error };
    }
    redirect("/quotation");
  }
  try {
    const db = database();
    const valid = await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, 1))
        .for("update");
      if (!user || (user.lockedUntil && user.lockedUntil > new Date()))
        return false;
      if (
        user.email !== email ||
        !verifyPassword(password, user.passwordHash)
      ) {
        await tx
          .update(users)
          .set({
            failedAttempts: sql`${users.failedAttempts} + 1`,
            lockedUntil:
              user.failedAttempts >= 4
                ? new Date(Date.now() + 15 * 60_000)
                : null,
          })
          .where(eq(users.id, 1));
        return false;
      }
      await tx
        .update(users)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(users.id, 1));
      return true;
    });
    if (!valid)
      return {
        error:
          "Incorrect email/password or sign-in temporarily locked. Try again in 15 minutes after repeated failed attempts.",
      };
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60_000);
    const previous = (await cookies()).get(COOKIE)?.value;
    if (previous)
      await db
        .delete(sessions)
        .where(eq(sessions.tokenHash, tokenHash(previous)));
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    await db
      .insert(sessions)
      .values({ tokenHash: tokenHash(token), userId: 1, expiresAt });
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  } catch (error) {
    const failure = loginFailure(error);
    console.error("[login] Authentication backend unavailable:", failure.code);
    return { error: failure.error };
  }
  redirect("/quotation");
}
export async function logoutAction() {
  if (authProvider() === "supabase") {
    const supabase = await supabaseServer();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login");
  }
  const token = (await cookies()).get(COOKIE)?.value;
  if (token)
    await database()
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash(token)));
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
export async function masterAction(
  kind: MasterKind,
  id: string | null,
  input: unknown,
) {
  await requireUser();
  try {
    z.enum(["items", "customers", "vendors", "prices", "packages"]).parse(kind);
    await repo.saveMaster(database(), kind, id, input);
    revalidatePath("/master", "layout");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}
export async function profileAction(input: Profile) {
  await requireUser();
  try {
    await repo.saveProfile(database(), input);
    revalidatePath("/profile");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}
export async function quotationAction(input: {
  id: string | null;
  version: number | null;
  data: Quotation;
}) {
  await requireUser();
  try {
    const saved = await repo.saveQuotation(database(), input);
    revalidatePath("/quotation", "layout");
    revalidatePath("/sales");
    return { ok: true as const, id: saved.id, version: saved.version };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}
export async function statusAction(
  id: string,
  version: number,
  status: Status,
) {
  await requireUser();
  try {
    await repo.changeStatus(database(), id, version, status);
    revalidatePath("/quotation", "layout");
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}
export async function passwordAction(current: string, next: string) {
  await requireUser();
  if (current.length > 1024)
    return { ok: false, error: "The current password is incorrect." };
  if (next.length < 12 || next.length > 1024)
    return {
      ok: false,
      error: "The new password must contain at least 12 characters.",
    };
  if (authProvider() === "supabase") {
    try {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email || !isAllowedUser(user))
        return {
          ok: false,
          error: "Your session expired. Please sign in again.",
        };
      // Verify the current password without replacing the active cookie session.
      const { url, key } = supabaseConfig();
      const verifier = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const verified = await verifier.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (verified.error || verified.data.user?.id !== user.id)
        return { ok: false, error: "The current password is incorrect." };
      await verifier.auth.signOut({ scope: "local" });
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error)
        return {
          ok: false,
          error:
            "The password could not be changed. Check that it meets the Supabase password policy and differs from your previous password.",
        };
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      return {
        ok: false,
        error:
          "The account service is temporarily unavailable. Please try again shortly.",
      };
    }
    redirect("/login");
  }
  const db = database();
  const [user] = await db.select().from(users).where(eq(users.id, 1));
  if (!user || !verifyPassword(current, user.passwordHash))
    return { ok: false, error: "The current password is incorrect." };
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: hashPassword(next) })
      .where(eq(users.id, 1));
    await tx.delete(sessions).where(eq(sessions.userId, 1));
  });
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
