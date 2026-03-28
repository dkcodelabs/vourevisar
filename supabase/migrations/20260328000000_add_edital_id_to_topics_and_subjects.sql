-- Add edital_id column to subjects and topics tables
-- Reference to the user_editais table

ALTER TABLE "public"."subjects" ADD COLUMN IF NOT EXISTS "edital_id" uuid;
ALTER TABLE "public"."topics" ADD COLUMN IF NOT EXISTS "edital_id" uuid;

-- Add foreign keys constraint with cascade set null (so if edital is deleted, topics/subjects become "manual")
ALTER TABLE "public"."subjects"
ADD CONSTRAINT "subjects_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais" ("id") ON DELETE SET NULL;

ALTER TABLE "public"."topics"
ADD CONSTRAINT "topics_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais" ("id") ON DELETE SET NULL;

-- Create indexes for performance reading by edital_id
CREATE INDEX IF NOT EXISTS "idx_subjects_edital_id" ON "public"."subjects" ("edital_id");
CREATE INDEX IF NOT EXISTS "idx_topics_edital_id" ON "public"."topics" ("edital_id");
