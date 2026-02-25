
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. PROJECTS
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  script TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CHARACTERS
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  prompt_tokens TEXT DEFAULT '',
  reference_image_url TEXT,
  best_seed INTEGER,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own characters" ON public.characters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. SCENES
CREATE TABLE public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL DEFAULT 1,
  direction TEXT DEFAULT '',
  prompt TEXT DEFAULT '',
  negative_prompt TEXT DEFAULT '',
  seed_image_url TEXT,
  audio_url TEXT,
  resolution TEXT NOT NULL DEFAULT '720p',
  duration INTEGER NOT NULL DEFAULT 5,
  seed INTEGER,
  use_random_seed BOOLEAN NOT NULL DEFAULT true,
  shot_type TEXT DEFAULT 'medium',
  prompt_expansion BOOLEAN NOT NULL DEFAULT true,
  audio_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  character_ids UUID[] DEFAULT '{}',
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scenes" ON public.scenes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON public.scenes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. GENERATIONS
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  atlas_task_id TEXT,
  atlas_result_url TEXT,
  video_url TEXT,
  prompt_used TEXT DEFAULT '',
  negative_prompt_used TEXT DEFAULT '',
  parameters JSONB DEFAULT '{}',
  cost NUMERIC(10,4) DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own generations" ON public.generations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_generations_updated_at BEFORE UPDATE ON public.generations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. IMAGE_EDITS
CREATE TABLE public.image_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  edited_url TEXT,
  edit_type TEXT NOT NULL DEFAULT 'crop',
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.image_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own image_edits" ON public.image_edits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. PROMPT_BLOCKS
CREATE TABLE public.prompt_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read builtin blocks" ON public.prompt_blocks FOR SELECT USING (is_builtin = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own custom blocks" ON public.prompt_blocks FOR INSERT WITH CHECK (auth.uid() = user_id AND is_builtin = false);
CREATE POLICY "Users update own custom blocks" ON public.prompt_blocks FOR UPDATE USING (auth.uid() = user_id AND is_builtin = false);
CREATE POLICY "Users delete own custom blocks" ON public.prompt_blocks FOR DELETE USING (auth.uid() = user_id AND is_builtin = false);

-- 7. USER_SETTINGS
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  atlas_api_key TEXT DEFAULT '',
  default_model TEXT NOT NULL DEFAULT 'wan26-i2v-flash',
  default_resolution TEXT NOT NULL DEFAULT '720p',
  default_duration INTEGER NOT NULL DEFAULT 5,
  default_shot_type TEXT NOT NULL DEFAULT 'medium',
  default_prompt_expansion BOOLEAN NOT NULL DEFAULT true,
  default_audio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create user_settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
