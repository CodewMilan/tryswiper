import postgres from "postgres";

export const testDatabaseUrl = process.env.E2E_DATABASE_URL ?? "postgres://swiper:swiper@localhost:54329/swiper";

/** Remove only the synthetic users created by this test run, including their drafts. */
export async function cleanupTestUsers(ids: string[]) {
  if (!ids.length) return;
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    await sql.begin(async (tx) => {
      const users = await tx<{ id: string }[]>`
        select id from "user"
        where id in ${tx(ids)} and (
          (name = 'Editor QA' and email ~ '^swiper-qa-[0-9a-f-]+@example\\.test$')
          or (id ~ '^usr_[a-f0-9]{20}$' and name = 'Deleted account' and deleted_at is not null
            and email ~ '^[a-f0-9]{64}@deleted\\.swiper\\.invalid$')
        )
      `;
      const verified = users.map((user) => user.id);
      if (!verified.length) return;
      await tx`delete from workspace where owner_id in ${tx(verified)}`;
      await tx`delete from "user" where id in ${tx(verified)}`;
    });
  } finally {
    await sql.end();
  }
}
