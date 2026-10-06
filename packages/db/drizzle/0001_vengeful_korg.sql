CREATE TABLE "workspace_format" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source_carousel_id" text,
	"content_json" jsonb NOT NULL,
	"plan_json" jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_format" ADD CONSTRAINT "workspace_format_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_format" ADD CONSTRAINT "workspace_format_source_carousel_id_carousel_id_fk" FOREIGN KEY ("source_carousel_id") REFERENCES "public"."carousel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_format" ADD CONSTRAINT "workspace_format_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_format_workspace_idx" ON "workspace_format" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_format_workspace_name_idx" ON "workspace_format" USING btree ("workspace_id","name");