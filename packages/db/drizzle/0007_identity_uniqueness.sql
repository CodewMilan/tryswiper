LOCK TABLE "account" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "account" GROUP BY "provider_id", "account_id" HAVING count(DISTINCT "user_id") > 1) THEN
    RAISE EXCEPTION 'A provider identity maps to multiple users; reconcile these mappings before migration';
  END IF;
END $$;
CREATE TABLE "account_identity_archive" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "archived_at" timestamp DEFAULT now() NOT NULL
);
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "provider_id", "account_id" ORDER BY "updated_at" DESC, "id") AS rank
  FROM "account"
)
INSERT INTO "account_identity_archive"("id", "user_id", "data")
SELECT a."id", a."user_id", to_jsonb(a) FROM "account" a JOIN ranked r ON r."id" = a."id" WHERE r.rank > 1;
DELETE FROM "account" WHERE "id" IN (SELECT "id" FROM "account_identity_archive");
CREATE UNIQUE INDEX "account_provider_identity_idx" ON "account"("provider_id", "account_id");
