import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { accountProfiles } from "../db/schema";
import {
  accountSchema,
  signatureSchema,
  type AccountProfile,
} from "../domain/account";
export function accountKey(user: string | number) {
  return typeof user === "number" ? `internal:${user}` : `supabase:${user}`;
}
export async function accountProfile(
  db: Database,
  key: string,
): Promise<AccountProfile | null> {
  const [account] = await db
    .select()
    .from(accountProfiles)
    .where(eq(accountProfiles.id, key));
  if (!account) return null;
  const { username, name, phone, signature, version } = account;
  return { username, name, phone, signature, version };
}
export { normalizeDocumentImage as normalizeSignature } from "./document-images";
export async function saveAccountProfile(
  db: Database,
  key: string,
  input: unknown,
  version: number,
  signature: string | null | undefined,
) {
  const fields = accountSchema.parse(input);
  z.number().int().nonnegative().parse(version);
  if (signature !== undefined) signatureSchema.parse(signature);
  return db.transaction(async (tx) => {
    if (version === 0) {
      const [saved] = await tx
        .insert(accountProfiles)
        .values({ id: key, ...fields, signature: signature ?? null })
        .onConflictDoNothing()
        .returning();
      if (!saved)
        throw new Error(
          "This account changed or the username is already in use. Reload and try again.",
        );
      return saved;
    }
    const [saved] = await tx
      .update(accountProfiles)
      .set({
        ...fields,
        ...(signature !== undefined ? { signature } : {}),
        version: version + 1,
      })
      .where(
        and(eq(accountProfiles.id, key), eq(accountProfiles.version, version)),
      )
      .returning();
    if (!saved)
      throw new Error(
        "This account changed in another tab. Reload before saving.",
      );
    return saved;
  });
}
