CREATE TABLE IF NOT EXISTS "admin_line_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"line_account_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_whitelist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_whitelist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_key_line_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"line_account_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_group_id" varchar(100) NOT NULL,
	"group_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "groups_line_group_id_unique" UNIQUE("line_group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "line_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"line_id" varchar(100) NOT NULL,
	"channel_id" varchar(100) NOT NULL,
	"channel_secret" varchar(255) NOT NULL,
	"channel_access_token" varchar(1024) NOT NULL,
	"webhook_forward_url" varchar(1024),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "line_accounts_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"line_account_id" uuid,
	"endpoint" varchar(255) NOT NULL,
	"status_code" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_user_id" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"picture_url" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"webhook_event_id" varchar(255) PRIMARY KEY NOT NULL,
	"line_account_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_line_accounts" ADD CONSTRAINT "admin_line_accounts_admin_id_admin_whitelist_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_whitelist"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_line_accounts" ADD CONSTRAINT "admin_line_accounts_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_key_line_accounts" ADD CONSTRAINT "api_key_line_accounts_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_key_line_accounts" ADD CONSTRAINT "api_key_line_accounts_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_line_accounts_admin_id_idx" ON "admin_line_accounts" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_line_accounts_line_account_id_idx" ON "admin_line_accounts" USING btree ("line_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_key_line_accounts_api_key_id_idx" ON "api_key_line_accounts" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_key_line_accounts_line_account_id_idx" ON "api_key_line_accounts" USING btree ("line_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_api_key_id_idx" ON "usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_line_account_id_idx" ON "usage_logs" USING btree ("line_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_created_at_idx" ON "usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_line_account_id_idx" ON "webhook_events" USING btree ("line_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_processed_at_idx" ON "webhook_events" USING btree ("processed_at");