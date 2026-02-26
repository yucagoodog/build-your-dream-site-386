

# ImgForge — Image Editing Pipeline Implementation Plan

## Summary

Adding a complete image editing and generation flow alongside the existing video pipeline. This uses the Atlas Cloud **Image Edit** API (`alibaba/wan-2.6/image-edit` at $0.021/image) — a fundamentally different workflow from video: source images get edited via natural language prompts, with version tracking, before/after comparison, and batch capabilities.

The two pipelines share the same app shell, auth, settings (API key), and prompt block infrastructure but have separate navigation sections, database tables, and editor screens.

---

## Architecture Decision: Separate Navigation

The bottom nav gets a 6th tab or we replace the current 5-tab layout. Per the spec, the image pipeline wants: **Projects, Gallery, Queue, Review, Settings**. Since both pipelines share Projects and Settings, the cleanest approach is:

- Add a **mode switcher** (Video / Image) at the top of the Projects screen, or
- Add a **Gallery** tab to the bottom nav (replacing the video-specific "Scenes" tab with a combined view)

I recommend: **Add a top-level toggle on the Projects page** between "Video Projects" and "Image Projects" — keeping the 5-tab nav. Gallery becomes a sub-screen of image projects (like Scenes is for video projects). Queue and Review pages get filters for video vs image items.

---

## Phase 1 Scope (Core Loop)

### Step 1: Database — New Tables

Create 3 new tables via migration:

**`source_images`** — uploaded images within a project
- `id`, `project_id`, `user_id`, `image_url`, `original_filename`, `width`, `height`, `file_size`, `tags[]`, `status` (active/archived), `approved_edit_id`, `created_at`, `updated_at`

**`image_edits`** — each edit operation on a source image (repurpose/extend existing `image_edits` table or create new `edits` table)
- `id`, `source_image_id`, `parent_edit_id` (nullable, for chaining), `user_id`, `model`, `prompt`, `negative_prompt`, `output_size`, `seed`, `enable_prompt_expansion`, `atlas_task_id`, `atlas_result_url`, `status` (queued/processing/completed/failed), `output_image_url`, `cost`, `character_ids[]`, `error_message`, `is_final`, `created_at`, `updated_at`

**`batch_jobs`** (placeholder for Phase 2, create schema now)
- `id`, `project_id`, `user_id`, `prompt`, `negative_prompt`, `parameters`, `source_image_ids[]`, `total_count`, `completed_count`, `failed_count`, `total_cost`, `status`, `created_at`

Add a `project_type` column to the existing `projects` table (`video` | `image`, default `video`).

RLS: all tables scoped to `auth.uid() = user_id`.

### Step 2: Add Image Prompt Blocks

Seed the `prompt_blocks` table with image-specific blocks from the spec:
- Photo Realism (Ultra Realism, Seed Lock, Scene Integration, Light Realism)
- Lighting Edits (Golden Hour, Studio Soft, Dramatic Side, Blue Hour, Neon Night, Natural Window, Backlit, Overcast)
- Subject Edits (Change Outfit, Change Background, Add Person, Remove Object, Change Expression, Age Adjust)
- Enhancement (Sharpen Detail, Skin Retouch, Color Correct, Deepen Contrast, Add Grain)
- Negative Presets for images (Standard, Portrait, Product)
- Image parameter pickers (Shot Type, Camera Angle, Lens, Aperture, Lighting, Color Palette, Camera Look)

These get a new category prefix like `img_` to distinguish from video blocks.

### Step 3: Edge Function — `generate-image`

New edge function `supabase/functions/generate-image/index.ts`:
- **Action: `start`** — validates source image exists, retrieves API key, calls `POST https://api.atlascloud.ai/api/v1/model/generateImage` with `model`, `image`, `prompt`, `negative_prompt`, `size`, `seed`, `enable_prompt_expansion`. Creates `image_edits` record with `status: processing`.
- **Action: `poll`** — polls `urls.result` from Atlas until `status = completed`, then stores `output_image_url`.
- Uses same auth pattern as `generate-video`.

### Step 4: Projects Page — Mode Switcher

Add a segmented toggle at the top of ProjectsPage: **Video** | **Image**.
- Filters projects by `project_type`.
- "New Project" sheet gets a project type selector.
- Image projects navigate to `/gallery/:projectId` instead of `/scenes/:projectId`.

### Step 5: Gallery Page (`/gallery/:projectId`)

New page: `src/pages/GalleryPage.tsx`
- Sticky header: project name + image count + total cost.
- **Image grid**: 2-col on mobile, 3-col tablet, 4-col desktop. Each thumbnail shows edit count badge.
- **Bulk upload**: FAB "+ Upload Images" → bottom sheet with file picker (multi-select), camera, URL, paste.
- Tap image → navigates to Image Detail screen.

### Step 6: Image Detail / Edit Screen (`/image/:sourceImageId`)

New page: `src/pages/ImageEditorPage.tsx`
- **Full-width source image** preview at top.
- **Version timeline**: horizontal scrollable row of thumbnails (original → edit 1 → edit 2...). Tap any to view full-size.
- **Before/after swipe slider**: compare source vs any edit output.
- **"New Edit" button** → opens Edit Bottom Sheet.
- **"Use as Source"** button on any edit output → creates new edit with `parent_edit_id`.
- **"Approve"** star button to mark an edit as final.

### Step 7: Edit Bottom Sheet

Bottom sheet containing:
- Source image thumbnail (read-only).
- Edit prompt textarea with character counter.
- Block picker: collapsible sections for realism, lighting, subject, enhancement chips (reusing the same chip-toggle pattern from SceneEditorPage prompt builder).
- Negative prompt with quick-apply presets (Standard, Portrait, Product).
- Output size picker (recommended sizes by aspect ratio from the spec).
- Model selector: WAN 2.6 Image Edit (default). Qwen Edit Plus as option.
- Seed: random toggle + number input.
- Cost display: "$0.021".
- **"Run Edit"** primary button → calls `generate-image` edge function, then polls.

### Step 8: Queue & Review Integration

- **QueuePage**: query both `generations` (video) and `image_edits` (image) tables. Show type badge (Video/Image). Filter tabs.
- **ReviewPage**: show completed image edits alongside completed video generations. Filter by type. Tap → full preview with approve/download.

### Step 9: Routing

Add new routes:
```
/gallery/:projectId  →  GalleryPage
/image/:sourceImageId  →  ImageEditorPage
```

---

## Technical Details

### API Differences (Image vs Video)

| | Video | Image |
|---|---|---|
| Endpoint | `/generateVideo` | `/generateImage` |
| Model | `wan-2.6/image-to-video-flash` | `wan-2.6/image-edit` |
| Key params | resolution, duration, audio, shot_type | size (W*H), enable_prompt_expansion |
| Cost | $0.06-0.12 × duration | $0.021 flat |
| Polling | Same pattern | Same pattern |

### Recommended Output Sizes (stored as constants)

```text
1:1  → 1024×1024 (medium), 1408×1408 (high)
3:2  → 1216×832, 1728×1152
4:3  → 1152×896, 1664×1216
16:9 → 1344×768, 1920×1088
```

### File Structure (new files)

```text
src/pages/GalleryPage.tsx
src/pages/ImageEditorPage.tsx
supabase/functions/generate-image/index.ts
```

### Shared Infrastructure

- Auth, AppShell, BottomNav — unchanged (except project type filter)
- Settings page — same API key works for both
- Prompt blocks table — shared, differentiated by category prefix
- Storage bucket `seed-images` — reused for source images

---

## Implementation Order

1. Database migration (new tables + `project_type` column)
2. Seed image prompt blocks
3. `generate-image` edge function
4. Projects page mode switcher
5. Gallery page with bulk upload
6. Image detail/editor page with edit bottom sheet + version timeline
7. Queue & Review page updates

