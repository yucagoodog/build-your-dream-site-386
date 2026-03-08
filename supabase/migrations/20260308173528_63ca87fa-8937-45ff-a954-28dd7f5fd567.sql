ALTER TABLE public.image_edits ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;