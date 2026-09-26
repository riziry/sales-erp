CREATE TABLE "account_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"signature" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "account_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "account_profiles" ENABLE ROW LEVEL SECURITY;