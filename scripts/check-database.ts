import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { databaseDiagnostic } from "../lib/db/diagnostics";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL)
    throw Object.assign(new Error(), { code: "DATABASE_NOT_CONFIGURED" });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    // Same tables read immediately after login; LIMIT 0 never returns business data.
    await pool.query(
      "SELECT role, username, name, phone, signature, version FROM account_profiles LIMIT 0",
    );
    await pool.query("SELECT * FROM quotations LIMIT 0");
    await pool.query("SELECT * FROM profiles LIMIT 0");
    console.log("Database connection, TLS settings, and workspace schema: OK.");
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(databaseDiagnostic(error));
  process.exitCode = 1;
});
