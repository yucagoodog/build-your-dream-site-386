
-- Seed built-in prompt blocks (WAN 2.6 knowledge)

-- Camera Movement
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('camera_movement', 'Static', 'static camera, no movement', true, 1),
('camera_movement', 'Slow Dolly In', 'slow dolly in, gradual zoom', true, 2),
('camera_movement', 'Slow Dolly Out', 'slow dolly out, gradual pull back', true, 3),
('camera_movement', 'Track Left to Right', 'camera tracking left to right, smooth lateral movement', true, 4),
('camera_movement', 'Track Right to Left', 'camera tracking right to left, smooth lateral movement', true, 5),
('camera_movement', 'Pan Left', 'slow pan left, smooth rotation', true, 6),
('camera_movement', 'Pan Right', 'slow pan right, smooth rotation', true, 7),
('camera_movement', 'Tilt Up', 'camera tilt up, revealing upward', true, 8),
('camera_movement', 'Tilt Down', 'camera tilt down, revealing downward', true, 9),
('camera_movement', 'Orbit', 'camera orbiting subject, circular movement', true, 10),
('camera_movement', 'Handheld', 'handheld camera, subtle natural movement', true, 11),
('camera_movement', 'Crane Up', 'crane shot rising upward', true, 12),
('camera_movement', 'Steadicam Follow', 'steadicam following subject, smooth tracking', true, 13);

-- Motion & Realism
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('realism', 'Standard Realism', 'photorealistic, natural lighting, real-world physics, lifelike textures', true, 1),
('realism', 'Dynamic Energy', 'dynamic movement, energetic motion, flowing fabric, wind effects', true, 2),
('realism', 'Calm & Slow', 'slow deliberate movement, calm pace, gentle motion, serene atmosphere', true, 3),
('realism', 'Full Body Motion', 'full body visible, natural body movement, realistic gestures, proper anatomy', true, 4),
('realism', 'Cinematic Realism', 'cinematic quality, film grain, shallow depth of field, anamorphic lens', true, 5);

-- Lighting & Style
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('lighting', 'Golden Hour', 'golden hour lighting, warm sunlight, long shadows, amber tones', true, 1),
('lighting', 'Cinematic', 'cinematic lighting, dramatic shadows, volumetric light, film-quality', true, 2),
('lighting', 'Documentary', 'documentary style, natural available light, authentic feel', true, 3),
('lighting', 'Studio Soft', 'studio soft lighting, even illumination, beauty lighting, soft shadows', true, 4),
('lighting', 'Film Noir', 'film noir lighting, high contrast, deep shadows, single key light', true, 5),
('lighting', 'Neon', 'neon lighting, vibrant colors, urban glow, cyberpunk atmosphere', true, 6),
('lighting', 'Natural Daylight', 'natural daylight, clear sky, balanced exposure', true, 7),
('lighting', 'Overcast', 'overcast diffused light, soft even illumination, no harsh shadows', true, 8),
('lighting', 'Backlit', 'backlit subject, rim lighting, silhouette edges, halo effect', true, 9),
('lighting', 'Moonlight', 'moonlight, cool blue tones, night atmosphere, subtle illumination', true, 10);

-- Identity / Character
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('identity', 'Consistent Face', 'consistent facial features throughout, same person, identity preservation', true, 1),
('identity', 'Consistent Clothing', 'same outfit throughout, consistent wardrobe, matching attire', true, 2),
('identity', 'Age Consistency', 'consistent age appearance, same age throughout', true, 3);

-- Negative Prompt Presets
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('negative_preset', 'Standard', 'blurry, distorted, low quality, watermark, text overlay, deformed, ugly, duplicate, mutation, cropped', true, 1),
('negative_preset', 'Extended', 'blurry, distorted, low quality, watermark, text overlay, deformed, ugly, duplicate, mutation, cropped, bad anatomy, extra limbs, missing limbs, floating limbs, disconnected limbs, malformed hands, long neck, mutated, disfigured, poorly drawn face, cloned face', true, 2),
('negative_preset', 'Portrait', 'blurry, distorted face, asymmetric eyes, deformed iris, extra fingers, mutated hands, bad anatomy, poorly drawn eyes, crossed eyes, imperfect teeth, unnatural skin texture', true, 3);

-- Shot Types
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('shot_type', 'Extreme Close-Up', 'extreme close-up shot, tight framing on detail', true, 1),
('shot_type', 'Close-Up', 'close-up shot, face fills frame', true, 2),
('shot_type', 'Medium Close-Up', 'medium close-up, chest and above', true, 3),
('shot_type', 'Medium', 'medium shot, waist up framing', true, 4),
('shot_type', 'Medium Wide', 'medium wide shot, knees and above', true, 5),
('shot_type', 'Wide', 'wide shot, full body in frame with environment', true, 6),
('shot_type', 'Extreme Wide', 'extreme wide shot, establishing shot, landscape', true, 7);

-- Camera Angle
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('camera_angle', 'Eye Level', 'eye level camera angle, neutral perspective', true, 1),
('camera_angle', 'Low Angle', 'low angle shot, looking up at subject, powerful', true, 2),
('camera_angle', 'High Angle', 'high angle shot, looking down at subject', true, 3),
('camera_angle', 'Bird''s Eye', 'bird''s eye view, directly overhead', true, 4),
('camera_angle', 'Dutch Angle', 'dutch angle, tilted frame, dynamic tension', true, 5),
('camera_angle', 'Over the Shoulder', 'over the shoulder shot, POV framing', true, 6);
