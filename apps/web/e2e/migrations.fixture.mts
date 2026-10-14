import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const origin = new URL(process.argv[2]!);
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname), "Migration fixtures require a local test database.");
const admin = postgres(origin.toString(), { max: 1, prepare: false });
const folder = resolve(import.meta.dirname, "../../../packages/db/drizzle");
const journal = JSON.parse(await readFile(join(folder, "meta/_journal.json"), "utf8"));
const partialFolder = await mkdtemp(join(tmpdir(), "swiper-migration-"));
await mkdir(join(partialFolder, "meta"));
await writeFile(join(partialFolder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.filter((entry: { idx: number }) => entry.idx < 7) }));
for (const entry of journal.entries.filter((entry: { idx: number }) => entry.idx < 7)) await copyFile(join(folder, `${entry.tag}.sql`), join(partialFolder, `${entry.tag}.sql`));
const databases: string[] = [];
try {
  for (const conflict of [false, true]) {
    const name = `swiper_migration_${crypto.randomUUID().replaceAll("-", "")}`;
    await admin.unsafe(`CREATE DATABASE "${name}"`); databases.push(name);
    const target = new URL(origin); target.pathname = `/${name}`;
    const client = postgres(target.toString(), { max: 1, prepare: false });
    try {
      const database = drizzle(client);
      await migrate(database, { migrationsFolder: partialFolder });
      await client`insert into "user"(id,name,email) values('user_one','Migration QA','migration-one@example.test')`;
      await client`insert into account(id,account_id,provider_id,user_id) values('account_one','same_identity','clerk','user_one')`;
      if (conflict) await client`insert into "user"(id,name,email) values('user_two','Migration QA','migration-two@example.test')`;
      await client`insert into account(id,account_id,provider_id,user_id) values('account_two','same_identity','clerk',${conflict ? "user_two" : "user_one"})`;
      if (conflict) {
        await assert.rejects(migrate(database, { migrationsFolder: folder }), /multiple users/);
        assert.equal(Number((await client`select count(*) as n from account`)[0]!.n), 2);
      } else {
        await migrate(database, { migrationsFolder: folder });
        await migrate(database, { migrationsFolder: folder });
        assert.equal(Number((await client`select count(*) as n from account`)[0]!.n), 1);
        assert.equal(Number((await client`select count(*) as n from account_identity_archive`)[0]!.n), 1);
        await assert.rejects(client`insert into account(id,account_id,provider_id,user_id) values('account_three','same_identity','clerk','user_one')`, (error: unknown) => (error as { code: string }).code === "23505");
        assert.ok((await client`select to_regclass('public.creation_request') as name`)[0]!.name);
        assert.ok((await client`select to_regclass('public.billing_webhook') as name`)[0]!.name);
      }
    } finally { await client.end(); }
  }
} finally {
  for (const name of databases) await admin.unsafe(`DROP DATABASE "${name}"`);
  await admin.end();
  await rm(partialFolder, { recursive: true, force: true });
}
