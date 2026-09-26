CREATE TABLE "quotation_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"note" text NOT NULL,
	"due_date" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotation_followups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_followups" ADD CONSTRAINT "quotation_followups_series_id_quotation_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."quotation_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "followup_due_idx" ON "quotation_followups" USING btree ("done","due_date");