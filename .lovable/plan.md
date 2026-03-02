

## PNG Overlay Compositing Step

### What it does
A new flow step type called **"Image Overlay"** that takes a base image (from previous step output or uploaded seed) and composites a transparent PNG overlay on top, producing a single merged image.

### How it works
Since this is pure image compositing (no AI model needed), we can do it entirely in a **backend function** using canvas rendering:

1. **New Edge Function: `composite-image`**
   - Accepts `base_image_url` and `overlay_image_url`
   - Optional params: overlay position (x, y), scale, opacity
   - Uses Deno's image libraries to composite the overlay PNG onto the base image
   - Uploads the result to the `seed-images` storage bucket and returns the public URL
   - No Atlas API key needed — this is pure server-side image processing

2. **New Step Type in Flow Builder**
   - Add `"image_overlay"` to `StepType` and `STEP_TYPE_META` (icon: `Layers`, color: orange)
   - Config: `overlay_image_url` (the transparent PNG to place on top), plus optional `position`, `scale`, `opacity`
   - For step index 0: show a `SeedImageUpload` for the base image
   - For step index > 0: base image comes from previous step's output
   - Always show an overlay image uploader (separate `SeedImageUpload` labeled "Overlay PNG")

3. **Flow Execution Support**
   - Add an `image_overlay` branch in `FlowExecutionPage.tsx`'s `executeStep` that calls `composite-image` edge function
   - The function returns the composited image URL immediately (no polling needed, since it's not an async AI task) — but we can use the same start/poll pattern for consistency

4. **UI Components** (in `SharedGenerationUI.tsx`)
   - Add an `OverlayParamsSection` with opacity slider (0-100%) and optional position controls

### Files to create/modify
- **Create**: `supabase/functions/composite-image/index.ts` — edge function for server-side compositing
- **Modify**: `src/pages/FlowBuilderPage.tsx` — add `image_overlay` step type, config defaults, and UI
- **Modify**: `src/pages/FlowExecutionPage.tsx` — add execution branch for `image_overlay`
- **Modify**: `src/components/generation/SharedGenerationUI.tsx` — add `OverlayParamsSection`
- **Modify**: `supabase/config.toml` — add `[functions.composite-image]` with `verify_jwt = false`

### Technical detail
The edge function will use the `ImageScript` Deno library (available via esm.sh) to decode both PNGs, composite the overlay at the specified position/opacity, encode the result, and upload to storage.

