import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const db = drizzle(sql);
const lockId = 872341;

await sql`select pg_advisory_lock(${lockId})`;
try {
  await migrate(db, {
    migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), "drizzle"),
  });
} finally {
  await sql`select pg_advisory_unlock(${lockId})`;
  await sql.end({ timeout: 5 });
}

console.log("Database migrations applied.");
