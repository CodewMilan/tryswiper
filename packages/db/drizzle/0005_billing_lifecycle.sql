ALTER TABLE "billing" ADD COLUMN "product_id" text;
ALTER TABLE "billing" ADD COLUMN "subscription_created_at" timestamp;
ALTER TABLE "billing" ADD COLUMN "paid_through" timestamp;
ALTER TABLE "billing" ADD COLUMN "cancel_at_next_billing" boolean DEFAULT false NOT NULL;
ALTER TABLE "billing" ADD COLUMN "last_event_at" timestamp;
ALTER TABLE "billing" ADD COLUMN "last_verified_at" timestamp;
--> statement-breakpoint
CREATE TABLE "billing_webhook" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "occurred_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
