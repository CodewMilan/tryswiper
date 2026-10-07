CREATE TABLE "usage_event" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_job" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"carousel_id" text NOT NULL,
	"platform" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "publish_job" ADD CONSTRAINT "publish_job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "publish_job" ADD CONSTRAINT "publish_job_carousel_id_carousel_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousel"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "usage_event_workspace_kind_created_idx" ON "usage_event" USING btree ("workspace_id","kind","created_at");
--> statement-breakpoint
CREATE INDEX "publish_job_workspace_idx" ON "publish_job" USING btree ("workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "publish_job_workspace_idempotency_idx" ON "publish_job" USING btree ("workspace_id","idempotency_key");
