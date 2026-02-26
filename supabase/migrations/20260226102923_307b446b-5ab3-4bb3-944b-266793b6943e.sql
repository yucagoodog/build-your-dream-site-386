
ALTER TABLE public.user_settings
  ADD COLUMN default_image_model text NOT NULL DEFAULT 'alibaba/wan-2.6/image-edit',
  ADD COLUMN default_image_output_size text NOT NULL DEFAULT '1024*1024',
  ADD COLUMN default_image_prompt_expansion boolean NOT NULL DEFAULT true;
