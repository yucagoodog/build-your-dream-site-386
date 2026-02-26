
-- Add Quality Enhancement prompt blocks for images
-- New categories: img_skin, img_hair, img_eyes, img_fabric, img_camera, img_camera_physics, img_lighting_q, img_environment, img_product, img_post
-- Also add quality-specific negative presets

INSERT INTO public.prompt_blocks (label, value, category, sort_order, is_builtin) VALUES

-- img_skin: Skin Quality Layers
('Skin Mega-Stack', 'Visible skin pores on nose, cheeks, forehead. Fine peach fuzz catching light. Subsurface scattering on ears, fingertips, nose tip. Natural skin tone variation with color shifts across face. Slight redness on nose, cheeks, knuckles. Subtle imperfections: freckles, uneven tone, fine lines. Veins on hands and wrists. Natural under-eye texture. Lip texture with fine lines. Skin creasing at joints.', 'img_skin', 0, true),
('Pore Texture', 'visible skin pores on nose, cheeks, and forehead', 'img_skin', 1, true),
('Peach Fuzz', 'fine peach fuzz / vellus hair visible on face', 'img_skin', 2, true),
('Subsurface Scattering', 'subsurface scattering on ears, fingertips, nose tip', 'img_skin', 3, true),
('Skin Tone Variation', 'natural skin tone variation, subtle color shifts across face', 'img_skin', 4, true),
('Natural Imperfections', 'subtle imperfections: freckles, uneven tone, fine lines, moles', 'img_skin', 5, true),
('Redness Points', 'slight natural redness on nose tip, cheeks, knuckles, elbows', 'img_skin', 6, true),
('Hand Veins', 'subtle veins visible on hands, wrists, and temples', 'img_skin', 7, true),
('Under-Eye Texture', 'natural under-eye darkness and texture', 'img_skin', 8, true),
('Lip Texture', 'natural lip texture with fine lines, slight color variation', 'img_skin', 9, true),
('Moisture/Sweat', 'subtle moisture appropriate to context', 'img_skin', 10, true),
('Goosebumps', 'visible goosebumps on arms and shoulders', 'img_skin', 11, true),

-- img_hair: Hair Quality Layers
('Hair Stack', 'Individual flyaway hair strands catching light. Baby hairs at hairline. Visible strand separation. Scalp through part. Natural frizz. Hair refracting light with subtle highlights. Texture variation root to tip.', 'img_hair', 0, true),
('Flyaways', 'individual flyaway hair strands catching light', 'img_hair', 1, true),
('Baby Hairs', 'baby hairs visible at hairline', 'img_hair', 2, true),
('Strand Separation', 'individual hair strand separation, not a single mass', 'img_hair', 3, true),
('Scalp Visibility', 'visible scalp through hair part', 'img_hair', 4, true),
('Natural Frizz', 'natural frizz appropriate to hair type', 'img_hair', 5, true),
('Light Refraction', 'hair strands catching and refracting light, subtle highlights', 'img_hair', 6, true),
('Root-Tip Variation', 'hair texture variation from root to tip', 'img_hair', 7, true),

-- img_eyes: Eye Quality Layers
('Eye Stack', 'Detailed iris with visible fiber patterns. Accurate catchlights matching scene lighting. Subtle moisture on eye surface. Faint blood vessels in sclera. Individual eyelashes at varying lengths. Natural pupil size. Subtle environmental reflection.', 'img_eyes', 0, true),
('Catchlights', 'accurate catchlights matching scene light source position', 'img_eyes', 1, true),
('Iris Fibers', 'detailed iris texture with visible fiber patterns', 'img_eyes', 2, true),
('Sclera Veins', 'subtle blood vessels in sclera (whites of eyes)', 'img_eyes', 3, true),
('Individual Lashes', 'individual eyelashes at varying lengths', 'img_eyes', 4, true),
('Pupil Response', 'natural pupil size for lighting conditions', 'img_eyes', 5, true),
('Eye Reflection', 'subtle environmental reflection on eye surface', 'img_eyes', 6, true),

-- img_fabric: Fabric & Clothing Quality
('Fabric Stack', 'Natural fabric wrinkles at joints. Visible weave texture. Realistic drape. Subtle wear and aging. Material-appropriate sheen. Visible stitching and construction.', 'img_fabric', 0, true),
('Wrinkles', 'natural fabric wrinkles and creases at joints and folds', 'img_fabric', 1, true),
('Weave Texture', 'visible fabric weave pattern and fiber detail', 'img_fabric', 2, true),
('Natural Drape', 'natural fabric drape and gravity response', 'img_fabric', 3, true),
('Fabric Wear', 'subtle fabric wear: pilling, faded seams, natural aging', 'img_fabric', 4, true),
('Material Sheen', 'material-appropriate sheen: silk reflects ≠ cotton ≠ leather', 'img_fabric', 5, true),
('Construction Detail', 'visible stitching, button detail, seam construction', 'img_fabric', 6, true),

-- img_camera: Camera Presets
('Portrait Classic', 'Shot on Canon EOS R5, 85mm f/1.8, ISO 400', 'img_camera', 0, true),
('Fashion Editorial', 'Shot on Hasselblad X2D, 90mm f/3.2, medium format', 'img_camera', 1, true),
('Street Documentary', 'Shot on Fujifilm X-T4, 35mm f/2.0, ISO 800', 'img_camera', 2, true),
('Phone Selfie', 'Shot on iPhone 15 Pro, wide lens, slight noise', 'img_camera', 3, true),
('Studio Beauty', 'Shot on Sony A7IV, 105mm macro, ISO 200', 'img_camera', 4, true),
('Cinematic Camera', 'Shot on ARRI Alexa, anamorphic lens', 'img_camera', 5, true),
('Vintage Film', 'Shot on Contax T2, Kodak Portra 400', 'img_camera', 6, true),

-- img_optics: Optical Physics Layers
('Camera Physics Stack', 'Photographic grain ISO 400-800. Slight natural lens vignette. Shallow DOF with gradual focus falloff. Natural bokeh. Subtle chromatic aberration. Single-point autofocus on nearest eye.', 'img_optics', 0, true),
('Film Grain', 'photographic grain ISO 400-800, organic texture', 'img_optics', 1, true),
('Vignette', 'slight natural lens vignette, darkened corners', 'img_optics', 2, true),
('Bokeh', 'natural bokeh with circular highlights in background', 'img_optics', 3, true),
('Chromatic Aberration', 'subtle chromatic aberration on high-contrast edges', 'img_optics', 4, true),
('Shallow DOF', 'shallow depth of field, one eye sharp, ears slightly softer', 'img_optics', 5, true),
('Focus Falloff', 'gradual focus falloff from sharp subject to soft background', 'img_optics', 6, true),
('Barrel Distortion', 'subtle wide-angle barrel distortion', 'img_optics', 7, true),
('Lens Flare', 'subtle lens flare from backlight', 'img_optics', 8, true),

-- img_lighting_q: Lighting Quality Enhancement
('Lighting Quality Stack', 'Accurate shadow direction. Natural light falloff. Consistent color temperature. Specular highlights at correct positions. Ambient occlusion in creases. Color bounce from environment.', 'img_lighting_q', 0, true),
('Shadow Accuracy', 'accurate shadow direction and length matching light source', 'img_lighting_q', 1, true),
('Light Falloff', 'natural light falloff following inverse square law', 'img_lighting_q', 2, true),
('Color Temperature', 'consistent color temperature matching source type', 'img_lighting_q', 3, true),
('Specular Highlights', 'specular highlights on forehead, nose, cheekbones at correct positions', 'img_lighting_q', 4, true),
('Ambient Occlusion', 'ambient occlusion in creases: under chin, between fingers, neck folds', 'img_lighting_q', 5, true),
('Rim Light Edge', 'consistent rim light edge along subject outline', 'img_lighting_q', 6, true),
('Color Bounce', 'subtle color bounce from nearby surfaces onto skin', 'img_lighting_q', 7, true),
('Mixed Temperature', 'mixed color temperature from multiple sources with visible transition', 'img_lighting_q', 8, true),

-- img_environment: Environmental & Scene Quality
('Contact Shadows', 'contact shadows where objects meet surfaces', 'img_environment', 0, true),
('Reflections', 'accurate reflections in glass, metal, wet surfaces', 'img_environment', 1, true),
('Atmospheric Depth', 'subtle atmospheric haze on distant elements', 'img_environment', 2, true),
('Surface Wear', 'scratches, dust, fingerprints on surfaces', 'img_environment', 3, true),
('Background Clutter', 'natural background elements, everyday objects, slight mess', 'img_environment', 4, true),
('Material Accuracy', 'physically accurate material properties per surface type', 'img_environment', 5, true),

-- img_product: Product & Object Quality
('Product Sharp', 'Sharp focus. Visible material texture. Accurate reflections. Clean edges. Professional product photography.', 'img_product', 0, true),
('Product Lifestyle', 'Natural setting. Realistic shadows. Environmental context. DOF. Slight ambient imperfection. Editorial.', 'img_product', 1, true),
('Food Realism', 'Visible moisture/steam. Accurate textures: crispy, glossy, matte. Natural saturation. Contact shadows.', 'img_product', 2, true),
('Architecture', 'Accurate perspective. Sharp edges. Material textures visible. Architectural shadows. Straight verticals.', 'img_product', 3, true),
('Jewelry/Macro', 'Macro detail. Metal reflectivity. Gemstone refraction. Visible craftsmanship. Clean specular highlights.', 'img_product', 4, true),

-- img_post: Post-Processing Looks
('Unedited Raw', 'Unprocessed raw look. No grading. Neutral tones. Natural contrast. As-shot.', 'img_post', 0, true),
('Magazine Editorial', 'Professional finish. Controlled highlights. Fashion-grade color. Subtle contrast. Clean.', 'img_post', 1, true),
('Kodak Portra 400', 'Warm skin, gentle contrast, lifted shadows, fine grain, nostalgic warmth.', 'img_post', 2, true),
('Fuji Pro 400H', 'Cool-green tint, muted pastels, soft highlight rolloff, fine grain, editorial.', 'img_post', 3, true),
('VSCO Matte', 'Lifted blacks, desaturated, matte finish, warm tint, contemporary.', 'img_post', 4, true),
('Cinematic Look', 'Teal shadows, warm highlights, film contrast curve, cinematic color science.', 'img_post', 5, true),
('Film Noir B&W', 'High contrast B&W, deep blacks, dramatic shadows, vintage grain.', 'img_post', 6, true),
('Polaroid Look', 'Faded colors, warm tint, soft vignette, washed highlights, nostalgic.', 'img_post', 7, true),
('HDR Natural', 'Expanded dynamic range, shadow+highlight detail, vibrant but realistic.', 'img_post', 8, true),
('Soft Glow', 'Diffused highlights, dreamy atmosphere, reduced contrast, romantic.', 'img_post', 9, true),

-- Additional quality-focused negative presets
('Quality Anti-AI', 'airbrushed, plastic skin, smooth skin, perfect skin, no pores, waxy, uncanny valley, overprocessed, HDR look, digital art, 3D render, cartoon, illustration, painting, CGI, computer generated', 'img_negative', 10, true),
('Quality Standard', 'blurry, low quality, watermark, distorted, extra limbs, deformed hands, extra fingers, unnatural skin, plastic look, airbrushed, oversaturated, overexposed, underexposed, jpeg artifacts', 'img_negative', 11, true);
