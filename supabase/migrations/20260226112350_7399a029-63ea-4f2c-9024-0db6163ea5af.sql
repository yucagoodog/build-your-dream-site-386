
CREATE TABLE public.user_prompt_block_prefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  block_id uuid NOT NULL REFERENCES public.prompt_blocks(id) ON DELETE CASCADE,
  hidden boolean NOT NULL DEFAULT false,
  custom_sort_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, block_id)
);

ALTER TABLE public.user_prompt_block_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prompt prefs" ON public.user_prompt_block_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
