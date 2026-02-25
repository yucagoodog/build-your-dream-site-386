
-- Clear existing builtin blocks to avoid duplicates, then insert fresh from WAN 2.6 library
DELETE FROM public.prompt_blocks WHERE is_builtin = true;

INSERT INTO public.prompt_blocks (is_builtin, user_id, category, label, value, sort_order) VALUES
-- QUALITY ANCHORS
(true, null, 'quality', 'Cinematic 8K', 'cinematic, photorealistic, 8K', 1),
(true, null, 'quality', 'RAW Ultra-detailed', 'cinematic, RAW photo, ultra-detailed', 2),
(true, null, 'quality', 'Sharp High Fidelity', 'photorealistic, sharp focus, high fidelity', 3),
(true, null, 'quality', 'Film Grain 35mm', 'film grain, 35mm, photorealistic', 4),
(true, null, 'quality', 'Pro Cinematography', 'professional cinematography, photorealistic', 5),

-- SUBJECT / CHARACTER LOCK
(true, null, 'subject', 'Consistent Face', 'consistent facial features throughout', 10),
(true, null, 'subject', 'No Identity Drift', 'same face, no identity drift', 11),
(true, null, 'subject', 'Detailed Face', 'detailed realistic face', 12),
(true, null, 'subject', 'Consistent Clothing', 'consistent clothing throughout', 13),
(true, null, 'subject', 'Same Outfit', 'same outfit, no wardrobe change', 14),
(true, null, 'subject', 'Natural Skin', 'natural skin texture, visible pores', 15),
(true, null, 'subject', 'Consistent Skin Tone', 'consistent skin tone throughout', 16),
(true, null, 'subject', 'Detailed Eyes', 'detailed eyes, correct iris color', 17),

-- ACTION / MOTION — Subtle
(true, null, 'action', 'Breathing', 'subtle breathing motion', 20),
(true, null, 'action', 'Head Turn', 'slow natural head turn', 21),
(true, null, 'action', 'Idle Sway', 'gentle idle sway', 22),
(true, null, 'action', 'Blinking', 'eyes blinking naturally', 23),
(true, null, 'action', 'Lips Moving', 'lips moving slightly, speaking', 24),
-- Moderate
(true, null, 'action', 'Walking Forward', 'walking slowly forward', 25),
(true, null, 'action', 'Turning to Camera', 'turning to face camera', 26),
(true, null, 'action', 'Raising Hand', 'raising hand slowly', 27),
(true, null, 'action', 'Hair in Wind', 'hair moving in wind', 28),
-- Expressive
(true, null, 'action', 'Laughing', 'laughing naturally', 29),
(true, null, 'action', 'Nodding', 'nodding slowly', 30),
(true, null, 'action', 'Look Up at Camera', 'looking down then up at camera', 31),

-- CAMERA
(true, null, 'camera', 'Static Tripod', 'static camera, locked off tripod', 40),
(true, null, 'camera', 'No Movement', 'no camera movement', 41),
(true, null, 'camera', 'Slow Dolly In', 'slow dolly in', 42),
(true, null, 'camera', 'Slow Dolly Out', 'slow dolly out', 43),
(true, null, 'camera', 'Slow Pan Left', 'slow pan left', 44),
(true, null, 'camera', 'Slow Pan Right', 'slow pan right', 45),
(true, null, 'camera', 'Slow Tilt Up', 'slow tilt up', 46),
(true, null, 'camera', 'Slow Tilt Down', 'slow tilt down', 47),
(true, null, 'camera', 'Push In', 'gentle push in toward subject', 48),
(true, null, 'camera', 'Orbit', 'smooth orbit around subject', 49),
(true, null, 'camera', 'Steadicam Follow', 'steadicam follow', 50),
(true, null, 'camera', 'Handheld', 'subtle handheld shake', 51),

-- LIGHTING
(true, null, 'lighting', 'Soft Daylight', 'soft natural daylight, overcast sky', 60),
(true, null, 'lighting', 'Golden Hour', 'golden hour, warm side light', 61),
(true, null, 'lighting', 'Blue Hour', 'blue hour, cool ambient light', 62),
(true, null, 'lighting', 'Studio Frontal', 'soft studio lighting, frontal fill', 63),
(true, null, 'lighting', 'Side Key Light', 'side key light, soft shadow', 64),
(true, null, 'lighting', 'Three-Point', 'three-point studio setup', 65),
(true, null, 'lighting', 'Dramatic Side', 'dramatic side lighting, deep shadows', 66),
(true, null, 'lighting', 'Rim Light', 'rim light separating subject from background', 67),
(true, null, 'lighting', 'Volumetric', 'volumetric light, dust particles', 68),

-- NEGATIVE PROMPTS
(true, null, 'negative', 'Core Stability', 'worst quality, low quality, blurry, artifacts, morphing, flickering, jitter, deformed face, extra limbs, watermark', 80),
(true, null, 'negative', 'Face Drift Fix', 'face drift, identity change, warped features', 81),
(true, null, 'negative', 'Motion Fix', 'choppy motion, slideshow, stuttering', 82);
