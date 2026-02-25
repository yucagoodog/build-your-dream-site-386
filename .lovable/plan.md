

# VidForge — Phase 1 MVP Implementation Plan

## Overview
VidForge is a mobile-first bulk AI video production pipeline that transforms scripts into scenes, builds optimized prompts using built-in WAN 2.6 knowledge, and manages video generation via Atlas Cloud. Dark mode default, thumb-zone-optimized UI.

---

## Step 1: Foundation — Design System & Navigation Shell
- Set up dark mode as default theme with status colors (gray/blue/amber/green/red/orange)
- Build bottom navigation bar (5 tabs): Projects, Scenes, Queue, Review, Settings
- Implement mobile-first layout shell with sticky headers, bottom sheets (not modals), and swipeable tab infrastructure
- Configure routing for all main screens
- 44×44px minimum tap targets, FAB component, pull-to-refresh pattern

## Step 2: Supabase Auth & Database Schema
- Connect Supabase with email/password authentication (login + signup screens)
- Create all 7 tables: projects, characters, scenes, generations, image_edits, prompt_blocks, user_settings
- Set up Row Level Security (all user-scoped via auth.uid())
- Seed prompt_blocks table with all built-in WAN knowledge blocks (realism, camera, lighting, identity, negative prompt presets)

## Step 3: Settings Screen
- Atlas Cloud API key input (stored encrypted in user_settings)
- Default generation parameters: model, resolution (720p/1080p), duration (2-15s), seed, shot type, prompt expansion, audio
- Prompt Library viewer: browse/edit all built-in blocks by category
- LLM section shown as "Connect LLM in Settings to unlock" placeholder (Phase 2)

## Step 4: Projects Screen & CRUD
- Scrollable card list: project name, status badge, scene count, cost summary, last updated
- FAB: "+ New Project" → bottom sheet with name, description, script textarea
- "Break Into Scenes" button (manual mode only for MVP — mark scene breaks in script)
- Project delete with confirmation
- Desktop: 2-3 column card grid

## Step 5: Character Registry
- Character bottom sheet accessible from Scenes screen via "Characters" chip
- Character card: name, description, reference image upload, prompt tokens textarea, best seed, notes
- CRUD operations for characters within a project
- Character avatars shown on scene cards

## Step 6: Scenes Screen
- Sticky header: project name + scene count + estimated cost
- Scene cards showing: seed image thumbnail (or "Add Image" placeholder), scene number, direction excerpt, duration/resolution/cost tags, character avatars, status indicator
- FAB: "+ Add Scene" → bottom sheet prompting for seed image first
- Long-press context menu: Duplicate, Delete, Move
- Drag handles for reordering scenes
- Desktop: scene list sidebar + editor main content

## Step 7: Scene Editor — Tab 1: Image (Seed Image)
- Swipeable tab strip: Image → Prompt → Params → Results
- Top bar: Back button + "Scene X" + status + cost
- **No image state**: Large dashed upload zone, 2×2 grid buttons (Upload, Camera, URL, Paste), warning "Seed image required"
- **Image uploaded state**: Full-width preview, validation checklist (format, dimensions 360-2000px, file size ≤10MB, no transparency), Replace/Remove buttons
- Audio upload (optional WAV/MP3)
- Character assignment multi-select
- Scene Direction textarea

## Step 8: Scene Editor — Tab 2: Prompt Builder
- **Section A** (sticky): Full assembled prompt textarea with live character counter (green → amber at 1800 → red at 2000), Copy + Reset buttons
- **Section B**: Collapsible block pickers:
  - Camera movement chips (Static, Slow Dolly In, Track L→R, Track R→L, etc.)
  - Motion & Realism toggle checkboxes (Standard Realism, Dynamic Energy, Calm/Slow, Full Body)
  - Lighting & Style chips (Golden Hour, Cinematic, Documentary, Studio Soft, Film Noir, etc.)
  - Identity blocks (auto-applied when characters assigned)
  - Image parameter dropdowns: Shot Type, Camera Angle, Lens, Aperture, Lighting, Expression, Pose, Color, Camera Look
  - Custom text field
- Selecting any block immediately updates assembled prompt
- **Section C**: Negative prompt textarea + quick-apply preset buttons (Standard, Extended, Portrait)
- Smart assembly rules: character auto-injection, multi-shot warnings, duration-prompt alignment, speech-silence conflict detection

## Step 9: Scene Editor — Tab 3: Parameters
- "Use Project Defaults" toggle (dims controls when ON)
- Controls: resolution picker (720p/1080p), duration slider (2-15s), seed input + Random toggle, shot type selector, prompt expansion toggle, audio (On/Off/Custom URL)
- Real-time cost preview box with breakdown and silent cost comparison
- Cost calculation based on Atlas Cloud pricing table

## Step 10: Scene Editor — Tab 4: Results & Generation
- "Generate This Scene" button — disabled without valid seed image + non-empty prompt, shows specific error messages
- Edge function: generate-video (validates scene, calls Atlas Cloud I2V Flash, creates generation record)
- Edge function: poll-generation (polls atlas_result_url every 10-15s, updates status)
- Generation history list: inline video player, parameters used, cost per attempt
- Actions per generation: Select as Final, Regenerate Same, New Seed, Delete
- Status indicators: queued → submitted → processing → completed/failed

## Step 11: Auto-Save, Polish & UX Rules
- Debounced auto-save on every change
- Color-coded status dots on all scene cards and project cards
- Cost visibility everywhere: per-scene estimates, project totals
- Smart warnings (non-blocking): suggest more detail for long durations, seed locking after good generation, cost-saving suggestions (720p silent for drafting)
- Offline awareness banner
- Swipe navigation between scenes from scene editor
- Pull-to-refresh on all list screens

