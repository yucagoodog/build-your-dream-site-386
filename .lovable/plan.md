

## Consolidated App Redesign: 3-Tab Architecture

### Current Problems
- 6 nav tabs, 2 empty placeholders (Queue, Review)
- Projects → Scenes → SceneEditor is 3 clicks before generating video
- Projects → Gallery is 2 clicks before generating images
- Upscale only available as a button on Library results
- Image Editor page (per-source-image) adds yet another layer

### New Architecture

```text
Bottom Nav:  [ Create ]  [ Library ]  [ Settings ]

Create Screen (home "/"):
┌──────────────────────────────┐
│  [ Image Edit | Video | Upscale ]  ← mode tabs
├──────────────────────────────┤
│  Source media upload area     │
│  Prompt + block picker        │
│  Parameters                   │
│  [ Generate ] button          │
│  ── Active/Recent Results ──  │
│  Result cards with actions    │
└──────────────────────────────┘
```

### Implementation Steps

**1. Build unified Create page (`/`)**
- Three mode tabs: Image Edit, Video, Upscale
- Each mode shows its relevant controls inline (no bottom sheet needed):
  - **Image Edit**: 1-4 image slots, prompt + blocks, negative prompt, output size, model, seed, prompt expansion
  - **Video**: Single seed image, prompt + blocks, negative prompt, resolution, duration, shot type, seed, audio toggle
  - **Upscale**: Single image upload, scale factor selector, generate button (no prompt needed)
- Generate button at bottom calls the appropriate edge function
- Below the form: scrollable list of recent results for the active mode (polling active ones)
- Results show thumbnail, status badge, prompt excerpt, cost, and action buttons (download, re-edit, upscale for images)

**2. Simplify Library page**
- Remove project-based filtering since projects are gone
- Keep type filter (Image / Video / Upscale), status filter, search, sort
- Keep existing re-edit (navigates back to Create with pre-filled params), upscale, download, delete, copy actions
- Re-edit navigates to `/` with state instead of `/gallery/:projectId`

**3. Reduce bottom nav to 3 tabs**
- Create (home), Library, Settings
- Remove Projects, Scenes, Queue, Review tabs

**4. Clean up routes**
- Remove: `/scenes`, `/scenes/:projectId`, `/scene/:sceneId`, `/gallery/:projectId`, `/image/:sourceImageId`, `/queue`, `/review`
- Keep: `/` (Create), `/library`, `/settings`, `/auth`, `/reset-password`

**5. Update database usage**
- Stop requiring `project_id` for new generations — make it nullable (already nullable on `image_edits`, need migration for `generations.scene_id`)
- Store video generation params directly in `image_edits` or `generations` tables without needing a scene record
- Existing data remains intact; old project/scene records are preserved but not required for new generations

**6. Remove or archive unused pages**
- `ProjectsPage.tsx`, `ScenesPage.tsx`, `SceneEditorPage.tsx`, `GalleryPage.tsx`, `ImageEditorPage.tsx`, `QueuePage.tsx`, `ReviewPage.tsx` — all replaced by the unified Create page
- Keep the files but they won't be routed

**7. Update edge functions**
- `generate-video`: Accept params directly in the request body instead of reading from a scene record. Still support scene_id as optional for backward compatibility.
- `generate-image` and `upscale-image`: No changes needed (already accept direct params)

### Technical Notes
- The Create page reuses prompt block infrastructure from GalleryPage (image) and SceneEditorPage (video)
- Mode-specific controls are conditionally rendered based on active tab
- Recent results section queries `image_edits` or `generations` table filtered by user, ordered by `created_at desc`, limited to ~20
- Active polling for processing items continues as-is (4-second interval)
- Database migration: make `generations.scene_id` nullable

