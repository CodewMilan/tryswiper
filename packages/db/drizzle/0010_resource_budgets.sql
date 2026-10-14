CREATE TABLE "operation_lease" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "operation_lease_kind_expiry_idx" ON "operation_lease"("kind", "expires_at");
--> statement-breakpoint
CREATE TABLE "resource_window" (
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "requests" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "resource_window_workspace_kind_idx" ON "resource_window"("workspace_id", "kind");
