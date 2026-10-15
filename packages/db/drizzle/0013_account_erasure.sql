ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;
--> statement-breakpoint
CREATE TABLE "account_erasure" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "subscription_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);
