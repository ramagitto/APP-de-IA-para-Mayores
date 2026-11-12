CREATE TYPE "public"."product_event_type" AS ENUM('signup', 'app_opened', 'lesson_started', 'lesson_completed', 'help_requested', 'care_message', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"type" "product_event_type" NOT NULL,
	"lesson_id" text,
	"trigger" "lesson_trigger",
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"token_hash" text,
	"token_encrypted" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "web_participants_code_unique" UNIQUE("code"),
	CONSTRAINT "web_participants_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "product_events_subject" ON "product_events" USING btree ("subject_id","occurred_at");--> statement-breakpoint
CREATE INDEX "product_events_type" ON "product_events" USING btree ("type","occurred_at");