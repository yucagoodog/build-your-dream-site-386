
CREATE TABLE public.user_prompt_category_prefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  custom_sort_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_prompt_category_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own category prefs" ON public.user_prompt_category_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
