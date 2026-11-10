CREATE TYPE "public"."challenge_outcome" AS ENUM('done', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms_and_privacy', 'whatsapp_opt_in', 'sponsor_sharing');--> statement-breakpoint
CREATE TYPE "public"."lesson_attempt_state" AS ENUM('awaiting_practice', 'awaiting_challenge_report', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."lesson_trigger" AS ENUM('user_message', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('onboarding', 'active', 'paused');--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"version" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"lesson_version" integer NOT NULL,
	"state" "lesson_attempt_state" NOT NULL,
	"trigger" "lesson_trigger" NOT NULL,
	"paid_messages_used" smallint NOT NULL,
	"practice_attempts" smallint DEFAULT 0 NOT NULL,
	"challenge_outcome" "challenge_outcome",
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	CONSTRAINT "lesson_attempts_message_budget" CHECK ("lesson_attempts"."paid_messages_used" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"last_completed_day" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" text NOT NULL,
	"phone_encrypted" text NOT NULL,
	"first_name" text,
	"reminder_hour" smallint DEFAULT 10 NOT NULL,
	"status" "user_status" DEFAULT 'onboarding' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_hash_unique" UNIQUE("phone_hash"),
	CONSTRAINT "users_reminder_hour_valid" CHECK ("users"."reminder_hour" between 0 and 23)
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consents_one_active_per_type" ON "consents" USING btree ("user_id","type") WHERE "consents"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_attempts_one_open_per_user" ON "lesson_attempts" USING btree ("user_id") WHERE "lesson_attempts"."state" in ('awaiting_practice', 'awaiting_challenge_report');