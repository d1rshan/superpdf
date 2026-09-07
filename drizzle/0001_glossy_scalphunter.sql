CREATE TYPE "public"."relationship_type" AS ENUM('SAME_FACT', 'CONTRADICTS', 'CONTEXTUALIZES');--> statement-breakpoint
ALTER TABLE "fact_relationships" ALTER COLUMN "type" SET DATA TYPE "public"."relationship_type" USING "type"::"public"."relationship_type";--> statement-breakpoint
ALTER TABLE "fact_relationships" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;