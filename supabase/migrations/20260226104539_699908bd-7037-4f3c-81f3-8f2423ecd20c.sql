
-- Clear existing image prompt blocks
DELETE FROM public.prompt_blocks WHERE category LIKE 'img_%';

-- Insert all image prompt blocks from WAN 2.6 knowledge base

-- ===== REALISM =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_realism', 'Full Realism Stack', 'Preserve original face and identity exactly. Add photorealistic detail: visible skin pores and texture, peach fuzz, flyaway hair strands, detailed iris texture with accurate catchlights, natural skin tone variation, individual eyelash detail, subtle veins on hands, natural imperfections, fabric wrinkles and texture, subsurface scattering on ears and fingertips, contact shadows, photographic grain ISO 400-800, slight lens vignette. Shot on Canon EOS R5, 85mm f/1.8. Unretouched editorial realism.', true, 1),
('img_realism', 'Short Realism', 'Shot on Canon EOS R5, 85mm f/1.8, ISO 400. Visible skin pores, peach fuzz, subsurface scattering. Flyaway hair strands. Catchlight in eyes. Natural imperfections. Wrinkled fabric. Slight lens vignette. Unretouched editorial photograph.', true, 2),
('img_realism', 'Seed Lock + Realism', 'Preserve original seed image exactly: maintain all facial features, body posture, positioning, proportions, and composition. Add only photorealistic enhancements: visible skin pores and texture, peach fuzz, flyaway hair strands, detailed iris with catchlights, natural skin tone variation, individual eyelashes, fabric wrinkles and texture detail, subsurface scattering on ears and fingertips, contact shadows, fine natural imperfections. Shot on Canon EOS R5, 85mm f/1.8, ISO 400-800, natural grain, slight vignette. Unretouched editorial photograph.', true, 3),
('img_realism', 'Skin Texture', 'visible skin pores and texture, peach fuzz', true, 10),
('img_realism', 'Eye Detail', 'detailed iris texture with accurate catchlights', true, 11),
('img_realism', 'Skin Variation', 'natural skin tone variation', true, 12),
('img_realism', 'Eyelashes', 'individual eyelash detail', true, 13),
('img_realism', 'Flyaway Hair', 'flyaway hair strands', true, 14),
('img_realism', 'Hand Detail', 'subtle veins on hands', true, 15),
('img_realism', 'Subsurface Scattering', 'subsurface scattering on ears and fingertips', true, 16),
('img_realism', 'Contact Shadows', 'contact shadows', true, 17),
('img_realism', 'Fabric Texture', 'fabric wrinkles and texture', true, 18),
('img_realism', 'Imperfections', 'natural imperfections', true, 19),
('img_realism', 'Film Grain', 'photographic grain ISO 400-800', true, 20),
('img_realism', 'Lens Vignette', 'slight lens vignette', true, 21),
('img_realism', 'Camera Anchor', 'Shot on Canon EOS R5, 85mm f/1.8', true, 22);

-- ===== IDENTITY =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_identity', 'Face Preserve', 'Preserve original face and identity exactly.', true, 1),
('img_identity', 'Full Identity Lock', 'Preserve original facial structure and identity. Keep existing face, body posture, positioning, proportions unchanged. Maintain face geometry. Same person throughout.', true, 2),
('img_identity', 'Multi-Person Preserve', 'Maintain all people in the image unchanged. Preserve each person''s distinct facial features, identity, body position, pose, and appearance. All subjects remain exactly as in the original.', true, 3);

-- ===== FACE SWAP =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_face_swap', 'Face Swap (Single)', 'Face swap: Replace the face with the face from the reference image. Maintain exact facial features, identity, and likeness from the reference. Preserve all original body, clothing, pose, background, lighting, camera angle, and composition. Ensure natural lighting match and seamless integration. Photorealistic quality, sharp focus.', true, 1),
('img_face_swap', 'Full Person Replace', 'Replace the person completely with the full person from the reference image. Use their entire body, face, hair, clothing, and physical appearance. Place them in the exact position and pose where the original person stood. Preserve the complete scene: all other people unchanged, all background elements, objects, environment, lighting, camera angle, and composition. Seamless integration with natural lighting and shadows. Photorealistic, high detail, sharp focus.', true, 2),
('img_face_swap', 'Reference-Based Scene', 'A photorealistic scene: the person should look exactly like the person in the reference image — same face, body, hair, clothing, and appearance. Use the source image as scene reference: replicate the setting, environment, background, lighting, camera angle, composition. The reference person should be positioned where the original person appears. Natural integration, professional photography, ultra-realistic, sharp focus, consistent lighting across all subjects.', true, 3),
('img_face_swap', 'Add Person to Group', 'Add a person standing at the specified position. Match exact lighting direction, color temperature, and shadow angles of the original scene. Person should have same photographic quality, same camera settings (focal length, depth of field, bokeh), same perspective and scale. Natural body positioning fitting the group composition. Seamless integration with identical skin tones under same lighting conditions, matching fabric sheen and texture quality. Contact shadows and occlusion where bodies are close. Same lens characteristics and grain. Preserve all existing people completely unchanged.', true, 4);

-- ===== LIGHTING =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_lighting', 'Golden Hour', 'Change lighting to golden hour: warm orange-yellow tones, soft diffused sunlight from low angle, long warm shadows, warm skin tones, golden rim light on hair and shoulders.', true, 1),
('img_lighting', 'Blue Hour', 'Change to blue hour lighting: cool blue-purple tones, soft ambient twilight, no harsh shadows, serene cool atmosphere, gentle skin tones.', true, 2),
('img_lighting', 'Studio Soft', 'Apply soft studio lighting: even illumination from large diffused source, minimal shadows, clean professional look, neutral color temperature, flattering on skin.', true, 3),
('img_lighting', 'Dramatic Side', 'Apply dramatic side lighting: strong directional light from one side, deep shadows on opposite side, high contrast, moody cinematic atmosphere, defined facial contours.', true, 4),
('img_lighting', 'Rembrandt', 'Apply Rembrandt lighting: 45-degree key light creating triangle of light on shadow-side cheek. Classic portrait setup, warm tones, controlled shadows.', true, 5),
('img_lighting', 'Neon Night', 'Add neon lighting: colorful reflections on skin and surfaces, urban night atmosphere, vibrant colored rim lights, cool shadows with warm color accents.', true, 6),
('img_lighting', 'Natural Window', 'Apply natural window light: soft side illumination from camera-left/right, gentle falloff across face, subtle shadows, warm-neutral tones, indoor ambient.', true, 7),
('img_lighting', 'Backlit', 'Add backlighting: rim light outlining the subject, silhouette edges glowing, atmospheric lens flare, subject front slightly darker, halo effect on hair.', true, 8),
('img_lighting', 'Overcast', 'Change to overcast lighting: soft diffused light from above, no harsh shadows, even illumination across scene, neutral-cool tones, flat but gentle.', true, 9),
('img_lighting', 'Harsh Midday', 'Change to harsh midday sun: direct overhead sunlight, strong defined shadows under nose/chin, high contrast, warm bright tones, squinting conditions.', true, 10),
('img_lighting', 'Candlelight', 'Change to candlelight: warm orange flickering glow, soft shadows, intimate atmosphere, dark background, warm skin tones, low-key mood.', true, 11),
('img_lighting', 'Ring Light', 'Apply ring light: circular catchlight in eyes, even frontal illumination, minimal shadows, beauty/social media look, slightly flat but flattering.', true, 12);

-- ===== SCENE =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_scene', 'Background Replace', 'Replace the background with [DESCRIBE NEW BACKGROUND]. Keep the subject completely unchanged: same face, body, pose, clothing, hair, and all lighting on the subject. Match the new background lighting direction to the existing subject lighting. Seamless edge integration. No artifacts at boundaries. Natural depth of field consistent with scene.', true, 1),
('img_scene', 'Background Blur', 'Increase background blur to shallow depth of field. Subject remains sharp and unchanged. Background becomes soft creamy bokeh, f/1.8 equivalent. Preserve all subject details, face, clothing, pose exactly.', true, 2),
('img_scene', 'Add Object', 'Add [DESCRIBE OBJECT] at [POSITION]. Match the object''s lighting, shadow direction, color temperature, and photographic quality to the existing scene. Natural scale and perspective. Contact shadows where object meets surfaces. Preserve everything else unchanged.', true, 3),
('img_scene', 'Remove Object', 'Remove [DESCRIBE OBJECT] from the image. Fill the area naturally with surrounding context, matching texture, lighting, and perspective. Seamless removal with no artifacts. Preserve all other elements.', true, 4),
('img_scene', 'Change Outfit', 'Change the subject''s clothing to [DESCRIBE NEW OUTFIT: garment type, color, fabric, fit, style]. Preserve face, body shape, pose, and all other elements exactly. New clothing should match the scene lighting, cast appropriate shadows, and have realistic fabric texture and wrinkles.', true, 5);

-- ===== STYLE (Film & Camera Looks) =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_style', 'Cinematic Grade', 'Apply cinematic color grading: teal shadows, warm highlights, film-like contrast curve, shallow depth of field, anamorphic lens feel. Professional color science.', true, 1),
('img_style', 'Kodak Portra 400', 'Apply Kodak Portra 400 film look: warm skin tones, gentle contrast, slightly lifted shadows, fine organic grain, nostalgic warmth, pastel highlights.', true, 2),
('img_style', 'Fujifilm Pro 400H', 'Apply Fujifilm Pro 400H look: slightly cool-green tint, muted pastels, soft highlight rolloff, fine grain, clean shadows, editorial fashion feel.', true, 3),
('img_style', 'Film Noir B&W', 'Convert to film noir black and white: high contrast, deep blacks, dramatic directional shadows, moody atmosphere, vintage grain structure.', true, 4),
('img_style', 'Polaroid', 'Apply Polaroid instant film look: slightly faded colors, warm yellow-green tint, soft vignette, washed highlights, nostalgic imperfect charm.', true, 5),
('img_style', 'VSCO Fade', 'Apply VSCO-style faded look: lifted blacks, desaturated colors, matte finish, soft warm tint, contemporary editorial aesthetic.', true, 6),
('img_style', 'HDR Detail', 'Enhance to HDR-style: expanded dynamic range, visible detail in both shadows and highlights, vibrant but natural colors, enhanced micro-contrast.', true, 7),
('img_style', 'Magazine Editorial', 'Professional magazine editorial finish: controlled highlights, fashion-grade color accuracy, subtle contrast enhancement, clean retouching look, sharp detail.', true, 8);

-- ===== ENHANCE =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_enhance', 'Sharpen', 'Enhance sharpness and fine detail. Crisp textures, clear edges, improved clarity. No oversharpening artifacts.', true, 1),
('img_enhance', 'Skin Retouch', 'Light skin retouching: smooth minor blemishes, even skin tone slightly, keep natural texture and pores clearly visible. Absolutely no plastic look.', true, 2),
('img_enhance', 'Color Correct', 'Correct white balance and color accuracy. Natural true-to-life colors. Remove any color casts. Neutral whites.', true, 3),
('img_enhance', 'Deepen Contrast', 'Increase contrast: richer blacks, brighter highlights, more visual depth. Preserve detail in shadows and highlights, don''t clip.', true, 4),
('img_enhance', 'Add Grain', 'Add subtle photographic film grain: ISO 400-800 organic texture, slight vignette. Avoid digital noise look. Natural, analog feel.', true, 5),
('img_enhance', 'Desaturate Subtle', 'Slightly desaturate colors for a muted, editorial tone. Not black and white — just less vivid. Elegant, understated palette.', true, 6),
('img_enhance', 'Warm Shift', 'Shift color temperature warmer: add golden warmth to highlights and midtones, warm skin tones, sunset-like atmosphere.', true, 7),
('img_enhance', 'Cool Shift', 'Shift color temperature cooler: add blue-silver tones, clinical or winter feel, cool skin tones, crisp atmosphere.', true, 8);

-- ===== NEGATIVE PRESETS =====
INSERT INTO public.prompt_blocks (category, label, value, is_builtin, sort_order) VALUES
('img_negative', 'Standard', 'blurry, low quality, watermark, distorted face, extra limbs, deformed hands, unnatural skin, plastic look, oversaturated, overexposed, underexposed, cropped, out of frame', true, 1),
('img_negative', 'Portrait', 'blurry, distorted face, asymmetric eyes, extra fingers, deformed hands, plastic skin, uncanny valley, oversaturated, overexposed, double chin artifact, floating hair, merged features, unnatural teeth', true, 2),
('img_negative', 'Product', 'blurry, distorted proportions, incorrect shadows, floating objects, unnatural reflections, low detail, watermark, text overlay, color banding, jpeg artifacts', true, 3),
('img_negative', 'Realism-Focused', 'blurry, airbrushed, plastic skin, smooth skin, perfect skin, no pores, uncanny valley, oversaturated, HDR look, overprocessed, digital art look, 3D render, cartoon, illustration, painting', true, 4),
('img_negative', 'Face Swap', 'blurry, distorted face, face mismatch, inconsistent lighting on face, visible edge, pasted look, uncanny valley, different skin tone on face, misaligned features, floating face, face morph artifact', true, 5);
