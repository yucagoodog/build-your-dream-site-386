
-- Make source_image_id nullable since workspace generates without pre-registered sources
ALTER TABLE public.image_edits ALTER COLUMN source_image_id DROP NOT NULL;

-- Add array of image URLs used in this generation (up to 4)
ALTER TABLE public.image_edits ADD COLUMN source_image_urls text[] DEFAULT '{}';
