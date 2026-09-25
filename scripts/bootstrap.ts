import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, profiles } from "../lib/db/schema";
import { hashPassword } from "../lib/server/password";
import { authProvider } from "../lib/supabase/config";
import { defaultProfile } from "../lib/domain/model";
loadEnvConfig(process.cwd());
async function main() {
  if (authProvider() === "supabase")
    throw new Error(
      "Create Supabase accounts through Authentication → Users. Use db:setup-supabase for initial setup instead of db:bootstrap.",
    );
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !process.env.DATABASE_URL ||
    !email ||
    !email.includes("@") ||
    !password ||
    password.length < 12
  )
    throw new Error(
      "Set DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters).",
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ id: 1, email, passwordHash: hashPassword(password) })
        .onConflictDoNothing();
      await tx
        .insert(profiles)
        .values({ id: 1, data: defaultProfile })
        .onConflictDoNothing();
    });
    console.log("Bootstrap complete. Existing accounts were not overwritten.");
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
