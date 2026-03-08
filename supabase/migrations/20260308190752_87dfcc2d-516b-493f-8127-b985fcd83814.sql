
-- Tamagotchi pets table
CREATE TABLE public.tamagotchi_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  avatar_urls text[] NOT NULL DEFAULT '{}',
  description text DEFAULT '',
  personality text DEFAULT '',
  hunger integer NOT NULL DEFAULT 100,
  happiness integer NOT NULL DEFAULT 100,
  energy integer NOT NULL DEFAULT 100,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tamagotchi_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pets"
  ON public.tamagotchi_pets FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tamagotchi events table
CREATE TABLE public.tamagotchi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.tamagotchi_pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'action',
  action_name text NOT NULL DEFAULT '',
  prompt_used text DEFAULT '',
  result_image_url text,
  result_video_url text,
  stat_changes jsonb DEFAULT '{}',
  xp_earned integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tamagotchi_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events"
  ON public.tamagotchi_events FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tamagotchi inventory table
CREATE TABLE public.tamagotchi_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.tamagotchi_pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_type text NOT NULL DEFAULT 'outfit',
  item_name text NOT NULL,
  item_image_url text,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tamagotchi_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inventory"
  ON public.tamagotchi_inventory FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
