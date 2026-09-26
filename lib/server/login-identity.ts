import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { accountProfiles } from "../db/schema";

const identifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine(
    (value) =>
      z.email().safeParse(value).success ||
      /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value),
  );
export function loginIdentifier(value: unknown): string | null {
  const result = identifierSchema.safeParse(value);
  return result.success ? result.data : null;
}
type Reader = Pick<Database, "select">;
export async function matchesInternalLogin(
  db: Reader,
  user: { id: number; email: string },
  identifier: string,
) {
  if (identifier.includes("@")) return user.email.toLowerCase() === identifier;
  const [profile] = await db
    .select({ username: accountProfiles.username })
    .from(accountProfiles)
    .where(eq(accountProfiles.id, `internal:${user.id}`));
  return profile?.username === identifier;
}
type AuthIdentity = { id: string; email?: string; is_anonymous?: boolean };
// Only the configured account can be resolved; neither the email nor the admin
// credential is returned to the browser. Read the current Auth email each time
// so confirmed email changes never leave a stale username mapping.
export async function resolveSupabaseLoginEmail(
  db: Reader,
  identifier: string,
  allowedId: string,
  getUser: (id: string) => Promise<AuthIdentity | null>,
): Promise<string | null> {
  if (loginIdentifier(identifier) !== identifier) return null;
  if (identifier.includes("@")) return identifier;
  const [profile] = await db
    .select({ id: accountProfiles.id })
    .from(accountProfiles)
    .where(
      and(
        eq(accountProfiles.id, `supabase:${allowedId}`),
        eq(accountProfiles.username, identifier),
      ),
    );
  if (!profile) return null;
  const user = await getUser(allowedId);
  if (!user || user.id !== allowedId || user.is_anonymous) return null;
  return user.email || null;
}
