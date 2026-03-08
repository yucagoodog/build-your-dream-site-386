
-- Companions (main character entity)
CREATE TABLE public.companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  personality text DEFAULT '',
  avatar_urls text[] DEFAULT '{}',
  mood_level integer DEFAULT 70,
  relationship_xp integer DEFAULT 0,
  relationship_level integer DEFAULT 1,
  current_room text DEFAULT 'living_room',
  current_outfit text DEFAULT 'casual',
  current_emotion text DEFAULT 'neutral',
  daily_schedule jsonb DEFAULT '{"morning":"bedroom","afternoon":"living_room","evening":"kitchen","night":"bedroom"}'::jsonb,
  last_interaction_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Companion assets (portraits, emotions, outfits, scene compositions)
CREATE TABLE public.companion_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_type text NOT NULL DEFAULT 'portrait',
  tags jsonb DEFAULT '{}',
  image_url text,
  status text DEFAULT 'draft',
  prompt_used text DEFAULT '',
  atlas_task_id text,
  created_at timestamptz DEFAULT now()
);

-- Rooms/locations
CREATE TABLE public.companion_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room_name text NOT NULL,
  room_type text DEFAULT 'custom',
  base_prompt text DEFAULT '',
  icon text DEFAULT '🏠',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Room background variants (time of day × weather)
CREATE TABLE public.companion_room_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.companion_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  time_of_day text DEFAULT 'morning',
  weather text DEFAULT 'clear',
  image_url text,
  status text DEFAULT 'draft',
  prompt_used text DEFAULT '',
  atlas_task_id text,
  created_at timestamptz DEFAULT now()
);

-- Pre-built interaction scenarios
CREATE TABLE public.companion_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scenario_name text NOT NULL,
  scenario_type text DEFAULT 'daily',
  required_room text,
  required_outfit text,
  required_emotion text,
  prompt_template text DEFAULT '',
  images text[] DEFAULT '{}',
  videos text[] DEFAULT '{}',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Interaction history log
CREATE TABLE public.companion_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  interaction_type text DEFAULT 'chat',
  content text DEFAULT '',
  ai_response text DEFAULT '',
  mood_change integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  scene_image_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_room_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own companions" ON public.companions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own companion_assets" ON public.companion_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own companion_rooms" ON public.companion_rooms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own room_variants" ON public.companion_room_variants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own companion_scenarios" ON public.companion_scenarios FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own companion_interactions" ON public.companion_interactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
