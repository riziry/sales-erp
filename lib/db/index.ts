import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { ywPool?: Pool };
export function database() {
  if (!process.env.DATABASE_URL)
    throw Object.assign(
      new Error(
        "DATABASE_URL is not configured. See README for PostgreSQL setup.",
      ),
      { code: "DATABASE_NOT_CONFIGURED" },
    );
  const pool = (globalDb.ywPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 10_000,
  }));
  return drizzle(pool, { schema });
}
export type Database = ReturnType<typeof database>;
