import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db";
import { users, sessions } from "../db/schema";
import { verifyPassword } from "./password";

export const emailChangeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your current password.").max(1024),
});
export type EmailChangeResult =
  | { ok: true; status: "changed" | "pending"; email: string }
  | { ok: false; error: string };
const incorrect = {
  ok: false as const,
  error:
    "The current password is incorrect or the account is temporarily locked.",
};

export async function changeInternalEmail(
  db: Database,
  userId: number,
  input: unknown,
): Promise<EmailChangeResult> {
  const { email, password } = emailChangeSchema.parse(input);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user || (user.lockedUntil && user.lockedUntil > new Date()))
      return incorrect;
    if (!verifyPassword(password, user.passwordHash)) {
      await tx
        .update(users)
        .set({
          failedAttempts: sql`${users.failedAttempts} + 1`,
          lockedUntil:
            user.failedAttempts >= 4
              ? new Date(Date.now() + 15 * 60_000)
              : null,
        })
        .where(eq(users.id, userId));
      return incorrect;
    }
    if (user.email.toLowerCase() === email)
      return { ok: false, error: "Enter a different email address." };
    await tx
      .update(users)
      .set({ email, failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    return { ok: true, status: "changed", email };
  });
}

// Narrow dependencies keep the provider flow testable without contacting real accounts.
type Auth = Pick<SupabaseClient["auth"], "getUser" | "updateUser">;
type Verifier = Pick<SupabaseClient["auth"], "signInWithPassword" | "signOut">;
export async function changeSupabaseEmail(
  auth: Auth,
  verifier: Verifier,
  userId: string,
  input: unknown,
  redirectTo: string,
): Promise<EmailChangeResult> {
  const { email, password } = emailChangeSchema.parse(input);
  const {
    data: { user },
    error,
  } = await auth.getUser();
  if (error || !user?.email || user.id !== userId || user.is_anonymous)
    return { ok: false, error: "Your session expired. Please sign in again." };
  if (user.email.toLowerCase() === email)
    return { ok: false, error: "Enter a different email address." };
  // This isolated client never replaces the current browser's cookie session.
  const verified = await verifier.signInWithPassword({
    email: user.email,
    password,
  });
  if (verified.data.session) await verifier.signOut({ scope: "local" });
  if (verified.error || verified.data.user?.id !== userId) return incorrect;
  const result = await auth.updateUser(
    { email },
    { emailRedirectTo: redirectTo },
  );
  if (result.error) {
    if (result.error.status === 429)
      return {
        ok: false,
        error:
          "Too many requests. Please wait a few minutes before trying again.",
      };
    return {
      ok: false,
      error:
        "Unable to change this email. It may already be in use, or the email service may be unavailable. Please try again.",
    };
  }
  if (!result.data.user || result.data.user.id !== userId)
    return {
      ok: false,
      error:
        "Unable to verify the update. Refresh your account before trying again.",
    };
  return {
    ok: true,
    status:
      result.data.user.email?.toLowerCase() === email ? "changed" : "pending",
    email,
  };
}
