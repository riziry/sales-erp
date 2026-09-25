/** Provision this app in an already-linked, otherwise empty Supabase database.
 * Uses the authenticated CLI; never prints passwords, URLs, or Auth user details.
 */
import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { defaultProfile } from "../lib/domain/model";
import { profiles } from "../lib/db/schema";
loadEnvConfig(process.cwd());

async function main() {
  if (process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is already configured. Use db:migrate; setup does not overwrite existing connections.",
    );
  const projectRef = (
    await readFile("supabase/.temp/project-ref", "utf8")
  ).trim();
  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  if (projectUrl.hostname !== `${projectRef}.supabase.co`)
    throw new Error(
      "The linked CLI project does not match the application configuration.",
    );
  const dir = await mkdtemp(join(tmpdir(), "yw-supabase-setup-"));
  await chmod(dir, 0o700);
  const cli = process.env.SUPABASE_CLI_PATH || "npx";
  const prefix = process.env.SUPABASE_CLI_PATH ? [] : ["supabase"];
  const query = async (sql: string): Promise<Record<string, unknown>[]> => {
    const file = join(dir, "query.sql");
    await writeFile(file, sql, { mode: 0o600 });
    try {
      const output = execFileSync(
        cli,
        [
          ...prefix,
          "db",
          "query",
          "--linked",
          "--file",
          file,
          "--output",
          "json",
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 60_000,
        },
      );
      const result = JSON.parse(output);
      return Array.isArray(result) ? result : result.rows || [];
    } catch {
      throw new Error(
        "Supabase setup query failed. Check CLI access to the linked project.",
      );
    }
  };
  let pool: Pool | undefined;
  try {
    const accounts = await query(
      "select id from auth.users where email_confirmed_at is not null order by created_at",
    );
    const allowed =
      process.env.SUPABASE_ALLOWED_USER_ID ||
      (accounts.length === 1 ? String(accounts[0].id) : "");
    if (
      !/^[a-f0-9-]{36}$/i.test(allowed) ||
      !accounts.some((a) => a.id === allowed)
    )
      throw new Error(
        "Set SUPABASE_ALLOWED_USER_ID to a confirmed Auth account before setup.",
      );
    const tables = await query(
      "select table_name from information_schema.tables where table_schema in ('public','drizzle')",
    );
    if (tables.length)
      throw new Error(
        "The database already contains tables. Run migrations with the appropriate connection; initial setup will not overwrite existing data.",
      );
    const roles = await query(
      "select rolname from pg_roles where rolname = 'yw_quotation_app'",
    );
    if (roles.length)
      throw new Error(
        "The application role already exists. Restore the saved DATABASE_URL; its password will not be reset automatically.",
      );
    const password = randomBytes(32).toString("hex");
    const url = new URL(
      (await readFile("supabase/.temp/pooler-url", "utf8")).trim(),
    );
    url.username = `yw_quotation_app.${projectRef}`;
    url.password = password;
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.set("sslrootcert", "certs/supabase-root-2021.crt");
    await query(`begin;
      create role yw_quotation_app with login password '${password}' noinherit;
      grant yw_quotation_app to postgres;
      grant connect, create on database postgres to yw_quotation_app;
      grant usage, create on schema public to yw_quotation_app;
      create schema drizzle authorization yw_quotation_app;
      commit;`);
    // Persist credentials immediately so an interrupted migration is recoverable.
    const envFile = ".env.local";
    let env = await readFile(envFile, "utf8").catch(() => "");
    const settings = {
      DATABASE_URL: url.toString(),
      AUTH_PROVIDER: "supabase",
      SUPABASE_ALLOWED_USER_ID: allowed,
    };
    for (const [key, value] of Object.entries(settings)) {
      const line = `${key}=${value}`;
      const pattern = new RegExp(`^${key}=.*$`, "m");
      env = pattern.test(env)
        ? env.replace(pattern, line)
        : `${env.trimEnd()}\n${line}\n`;
    }
    await writeFile(envFile, env, { mode: 0o600 });
    await chmod(envFile, 0o600);
    pool = new Pool({
      connectionString: url.toString(),
      connectionTimeoutMillis: 15_000,
    });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await db
      .insert(profiles)
      .values({ id: 1, data: defaultProfile })
      .onConflictDoNothing();
    console.log(
      "Supabase Auth is connected; application tables and profile are ready. Database credentials are stored only in .env.local.",
    );
  } finally {
    if (pool) await pool.end();
    await rm(dir, { recursive: true, force: true });
  }
}
main().catch((error) => {
  // Errors from a SQL client can include credentials/query parameters. Only surface our own setup messages.
  const code =
    error && typeof error.code === "string" ? error.code : "SETUP_FAILED";
  console.error(
    `Setup did not complete (${code}). Saved credentials remain in .env.local; run db:migrate after checking the connection.`,
  );
  process.exitCode = 1;
});
