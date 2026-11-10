CREATE TYPE "public"."inbound_status" AS ENUM('received', 'processed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."outbound_status" AS ENUM('pending', 'sent');--> statement-breakpoint
CREATE TYPE "public"."support_reason" AS ENUM('ayuda', 'care');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "inbound_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_message_id" text NOT NULL,
	"contact_hash" text NOT NULL,
	"payload_encrypted" text,
	"status" "inbound_status" DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "inbound_events_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inbound_event_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"contact_hash" text NOT NULL,
	"kind" text NOT NULL,
	"body_encrypted" text,
	"audio_id" text,
	"status" "outbound_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pending_signups" (
	"contact_hash" text PRIMARY KEY NOT NULL,
	"prompts_sent" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"contact_hash" text NOT NULL,
	"contact_encrypted" text NOT NULL,
	"reason" "support_reason" NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_inbound_event_id_inbound_events_id_fk" FOREIGN KEY ("inbound_event_id") REFERENCES "public"."inbound_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_messages_event_position" ON "outbound_messages" USING btree ("inbound_event_id","position");--> statement-breakpoint
CREATE INDEX "support_requests_status" ON "support_requests" USING btree ("status","created_at");