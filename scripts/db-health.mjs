import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/blockchain_audit";
const shouldMigrate = process.argv.includes("--migrate");

const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 3000
});

try {
  await client.connect();
  const version = await client.query("SELECT current_database() AS database_name, version() AS version");

  console.log(`Postgres connected: ${version.rows[0].database_name}`);
  console.log(String(version.rows[0].version).split(",")[0]);

  if (shouldMigrate) {
    const schema = await readFile(new URL("../backend/db/schema.sql", import.meta.url), "utf8");
    await client.query(schema);
    const migrations = await client.query("SELECT version, applied_at FROM schema_migrations ORDER BY applied_at");
    console.log(`Schema migration applied: ${migrations.rows.map((row) => row.version).join(", ")}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown Postgres connection error";
  console.error(`Postgres health failed: ${message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
