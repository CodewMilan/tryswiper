CREATE TABLE "creation_request" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "request_key" text NOT NULL,
  "payload_hash" text NOT NULL,
  "carousel_id" text REFERENCES "carousel"("id") ON DELETE SET NULL,
  "result_json" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "creation_request_workspace_key_idx" ON "creation_request"("workspace_id", "request_key");
