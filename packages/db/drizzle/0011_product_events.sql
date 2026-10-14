CREATE TABLE "product_event" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "carousel_id" text REFERENCES "carousel"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "source" text,
  "value" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "product_event_workspace_created_idx" ON "product_event"("workspace_id", "created_at");
