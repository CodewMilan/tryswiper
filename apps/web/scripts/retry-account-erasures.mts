import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const localEnv = fileURLToPath(new URL("../.env.local", import.meta.url));
if (process.env.NODE_ENV !== "production" && existsSync(localEnv)) process.loadEnvFile(localEnv);
const { isNull } = await import("drizzle-orm");
const { db, schema } = await import("../src/lib/db");
const { finishAccountErasure } = await import("../src/server/account-erasure");
try {
  const pending = await db.select({ id: schema.accountErasure.userId }).from(schema.accountErasure).where(isNull(schema.accountErasure.completedAt)).limit(100);
  let failed = 0;
  for (const job of pending) {
    try { await finishAccountErasure(job.id); }
    catch { failed += 1; }
  }
  console.log(JSON.stringify({ checked: pending.length, completed: pending.length - failed, pending: failed }));
  if (failed) process.exitCode = 1;
} finally { await db.$client.end(); }
