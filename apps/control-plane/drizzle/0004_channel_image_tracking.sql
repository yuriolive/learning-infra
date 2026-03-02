ALTER TABLE "release_channels" ADD COLUMN "current_image_tag" text;--> statement-breakpoint
ALTER TABLE "release_channels" ADD COLUMN "next_channel_id" text REFERENCES "release_channels"("id") ON DELETE SET NULL;--> statement-breakpoint
UPDATE "release_channels" SET "next_channel_id" = 'canary' WHERE "id" = 'internal';--> statement-breakpoint
UPDATE "release_channels" SET "next_channel_id" = 'stable' WHERE "id" = 'canary';
