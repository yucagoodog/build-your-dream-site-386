
-- Add character consistency video prompt blocks from WAN 2.6 Character Consistency Add-On

-- ===== IDENTITY (within-frame) =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('identity', 'Standard Identity', 'Preserve faces exactly. Consistent identity, same person throughout all frames. No face drift, no morphing, no feature changes between frames.', true, 1),
('identity', 'Strong Identity', 'Preserve original face and identity exactly throughout all frames. Consistent facial features, same person, no identity drift. Face remains consistent across frames: same bone structure, same eye shape, same proportions, same skin tone. Photorealistic portrait quality, clean skin texture, natural pores.', true, 2),
('identity', 'Full Body Identity', 'Preserve original faces and body anatomy exactly. Full body visible in frame throughout. Complete body proportions maintained. Consistent identity, same person, no face drift. Anatomically correct joint movement, natural muscle tension.', true, 3),
('identity', 'Minimal Motion Identity', 'Head and shoulders portrait, consistent identity, same person, neutral expression, soft key light, shallow depth of field. Face remains consistent across frames: subtle camera drift only, minimal head movement. Realistic skin texture, natural pores.', true, 4),
('identity', 'Controlled Motion Identity', 'Consistent identity, same person throughout. Very slow movement, steady. Eyes blink once near middle. Hair movement subtle. Face stable and recognizable in every frame. No face deformation during motion.', true, 5),
('identity', 'Dynamic Identity', 'Preserve faces exactly. Natural human motion with micro-expressions, realistic weight shifts, breathing rhythm, subtle body sway. Dynamic energy, emotional nuance. Anatomically correct joint movement, natural muscle tension. Hair and fabric physics. Consistent identity throughout, same person in every frame, no face drift or morphing.', true, 6),
('identity', 'Energetic Identity', 'Preserve faces exactly. Natural human motion with micro-expressions, realistic weight shifts, breathing rhythm, subtle body sway. Dynamic energy, emotional nuance. Anatomically correct joint movement, natural muscle tension. Hair and fabric physics. Smooth camera zoom into the action, subtle handheld movement. Motion blur on quick actions. Unscripted documentary feel. Same person throughout, no face morphing.', true, 7),
('identity', 'Identity Stacking', 'consistent identity, same person, photorealistic portrait, clean skin texture, natural pores', true, 8);

-- ===== MULTI-CHARACTER =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('multi_char', 'Two-Person Scene', 'Both characters maintain their distinct identities throughout. No feature blending between the two people. Each person''s face, hair, clothing, and body proportions stay exactly as described.', true, 1),
('multi_char', 'Three+ Person Scene', 'Maintain all people in scene unchanged. Preserve each person''s distinct facial features, identity, body position, and pose. No feature blending between subjects. Each person fully recognizable throughout.', true, 2),
('multi_char', 'Background Characters', 'Additional background figures remain generic and unobtrusive. Main character is the clear focus and center of frame. Preserve main character''s identity exactly. Background people maintain consistent generic appearances but are secondary.', true, 3);

-- ===== MULTI-SHOT =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('multi_shot', 'Multi-Shot Identity', 'Maintain exact character appearance across all shots. No face drift, no feature changes at transitions. Same person throughout all shots, no identity changes between cuts.', true, 1),
('multi_shot', 'Shot Transition Anchor', 'Same person, consistent face. Same appearance as previous shot.', true, 2),
('multi_shot', 'Cross-Scene Reminder', 'Consistent identity, same person as all other scenes, no identity variation.', true, 3);

-- ===== CONSISTENCY NEGATIVES =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('negative', 'Identity Standard', 'face drift, morphing, feature changes between frames, inconsistent identity, face deformation, melting face, flickering features, extra teeth, floating hair, merged features, uncanny valley, distorted face, asymmetric eyes', true, 10),
('negative', 'Identity Extended', 'face drift, face morph, identity change, feature deformation, melting, sagging, warping, flickering, jittery features, inconsistent face between frames, extra limbs, deformed hands, duplicate bodies, extra teeth, floating hair, merged features, face mismatch, skin tone shift, eye distortion, uncanny valley, overprocessed, plastic skin', true, 11),
('negative', 'Portrait-Specific', 'face drift, teeth morphing, eye distortion, over-sharpened eyes, mouth warp, lip deformation, nose shift, jawline change, hairline flicker, earring clipping through skin, glasses deformation, eyebrow asymmetry, chin morph', true, 12),
('negative', 'Multi-Person', 'feature blending between people, identity swap, faces merging, wrong person changing, mixed facial features, body proportion mismatch between subjects, inconsistent lighting on different faces, people overlapping unnaturally', true, 13);
