import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../lib/db/schema";
export async function testDatabase() {
  const socket = createServer();
  await new Promise<void>((r) => socket.listen(0, "127.0.0.1", r));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((r) => socket.close(() => r()));
  const dir = await mkdtemp(join(tmpdir(), "yw-test-pg-"));
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    port,
    user: "yw_test",
    password: "test-only-password",
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  const url = `postgresql://yw_test:test-only-password@127.0.0.1:${port}/postgres`;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
  } catch (e) {
    await pool.end();
    await pg.stop();
    throw e;
  }
  return {
    db,
    url,
    pool,
    close: async () => {
      await pool.end();
      await pg.stop();
    },
  };
}
