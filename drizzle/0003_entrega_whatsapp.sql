ALTER TABLE "inbound_events" ADD COLUMN "contact_encrypted" text;--> statement-breakpoint
ALTER TABLE "inbound_events" ADD COLUMN "forget_contact" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_events" ADD COLUMN "completed_at" timestamp with time zone;