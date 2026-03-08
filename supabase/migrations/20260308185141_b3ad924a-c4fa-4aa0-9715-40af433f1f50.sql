
-- Delete duplicate category prefs that would conflict on merge (keep the one with lower custom_sort_order)
DELETE FROM public.user_prompt_category_prefs a
USING public.user_prompt_category_prefs b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND (
    (a.category IN ('vid_realism') AND b.category = 'realism')
    OR (a.category IN ('vid_identity') AND b.category = 'identity')
    OR (a.category IN ('vid_negative') AND b.category = 'negative')
    OR (a.category = 'realism' AND b.category IN ('vid_realism'))
    OR (a.category = 'identity' AND b.category IN ('vid_identity'))
    OR (a.category = 'negative' AND b.category IN ('vid_negative'))
  );

-- Delete old prefixed rows that already have a unified counterpart
DELETE FROM public.user_prompt_category_prefs WHERE category IN ('img_realism', 'img_identity', 'img_face_swap', 'img_negative', 'vid_realism', 'vid_identity', 'vid_motion', 'vid_negative')
  AND user_id IN (
    SELECT user_id FROM public.user_prompt_category_prefs WHERE category IN ('realism', 'identity', 'face_swap', 'motion', 'negative')
  );

-- Now safely update remaining prefixed ones
UPDATE public.user_prompt_category_prefs SET category = 'realism' WHERE category IN ('img_realism', 'vid_realism');
UPDATE public.user_prompt_category_prefs SET category = 'identity' WHERE category IN ('img_identity', 'vid_identity');
UPDATE public.user_prompt_category_prefs SET category = 'face_swap' WHERE category = 'img_face_swap';
UPDATE public.user_prompt_category_prefs SET category = 'motion' WHERE category = 'vid_motion';
UPDATE public.user_prompt_category_prefs SET category = 'negative' WHERE category IN ('img_negative', 'vid_negative');

-- Unify prompt block categories
UPDATE public.prompt_blocks SET category = 'realism' WHERE category IN ('img_realism', 'vid_realism');
UPDATE public.prompt_blocks SET category = 'identity' WHERE category IN ('img_identity', 'vid_identity');
UPDATE public.prompt_blocks SET category = 'face_swap' WHERE category = 'img_face_swap';
UPDATE public.prompt_blocks SET category = 'motion' WHERE category = 'vid_motion';
UPDATE public.prompt_blocks SET category = 'negative' WHERE category IN ('img_negative', 'vid_negative');
