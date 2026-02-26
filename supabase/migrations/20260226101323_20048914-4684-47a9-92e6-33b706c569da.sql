
-- Step 1: Add project_type to projects
ALTER TABLE public.projects ADD COLUMN project_type text NOT NULL DEFAULT 'video';

-- Step 2: Create source_images table
CREATE TABLE public.source_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  original_filename text,
  width integer,
  height integer,
  file_size integer,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  approved_edit_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.source_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own source_images" ON public.source_images FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_source_images_updated_at BEFORE UPDATE ON public.source_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 3: Drop old image_edits and recreate for image pipeline
DROP TABLE IF EXISTS public.image_edits;

CREATE TABLE public.image_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_image_id uuid NOT NULL REFERENCES public.source_images(id) ON DELETE CASCADE,
  parent_edit_id uuid REFERENCES public.image_edits(id),
  user_id uuid NOT NULL,
  model text NOT NULL DEFAULT 'wan-2.6-image-edit',
  prompt text DEFAULT '',
  negative_prompt text DEFAULT '',
  output_size text DEFAULT '1024*1024',
  seed integer,
  enable_prompt_expansion boolean DEFAULT true,
  atlas_task_id text,
  atlas_result_url text,
  status text NOT NULL DEFAULT 'queued',
  output_image_url text,
  cost numeric DEFAULT 0.021,
  character_ids uuid[] DEFAULT '{}',
  error_message text,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.image_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own image_edits" ON public.image_edits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_image_edits_updated_at BEFORE UPDATE ON public.image_edits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 4: Create batch_jobs table (Phase 2 placeholder)
CREATE TABLE public.batch_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  prompt text DEFAULT '',
  negative_prompt text DEFAULT '',
  parameters jsonb DEFAULT '{}',
  source_image_ids uuid[] DEFAULT '{}',
  total_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batch_jobs" ON public.batch_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
