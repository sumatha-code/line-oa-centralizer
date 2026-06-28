CREATE TABLE IF NOT EXISTS "line_account_forward_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_account_id" uuid NOT NULL,
	"url" varchar(1024) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "user_id" varchar(100);--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "group_id" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "line_account_forward_urls" ADD CONSTRAINT "line_account_forward_urls_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "line_account_forward_urls_line_account_id_idx" ON "line_account_forward_urls" USING btree ("line_account_id");