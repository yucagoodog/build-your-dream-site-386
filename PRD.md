# Product Requirements Document (PRD)
## AI Media Studio — Image & Video Generation Platform

---

## 1. Product Overview

**AI Media Studio** is a web-based creative tool that enables users to generate, edit, upscale, and composite AI-powered images and videos using the Atlas API. It features a mobile-first design with a flow-based automation system for chaining multi-step generation pipelines.

**Target Users:** Digital artists, content creators, social media managers, and AI art enthusiasts who need a streamlined interface for AI-powered media generation workflows.

**Core Value Proposition:** Unified interface for image generation, video generation, image upscaling, and image compositing — with reusable automation flows to chain these operations together.

---

## 2. Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Lovable Cloud) — Auth, PostgreSQL, Storage, Edge Functions |
| AI Provider | Atlas API (external) — accessed via user-provided API key |
| State Management | React Query (server state), React useState (local state) |
| Routing | React Router v6 |

---

## 3. Features & Functional Requirements

### 3.1 Authentication (AuthPage, ResetPasswordPage)

| Requirement | Details |
|-------------|---------|
| Sign Up | Email + password registration |
| Sign In | Email + password login |
| Password Reset | Email-based reset flow |
| Session Management | Supabase Auth with JWT tokens |
| Route Protection | All app routes require authentication |

### 3.2 Create Page (`/`) — Core Generation Engine

The primary workspace with four generation modes:

#### 3.2.1 Image Generation Mode
| Parameter | Options |
|-----------|---------|
| Model | `alibaba/wan-2.6/image-edit` (default), others |
| Source Images | Up to 4 input image slots (uploaded to storage) |
| Prompt | Text prompt with prompt block insertion |
| Negative Prompt | Text to exclude from generation |
| Output Size | Configurable (e.g., 1280×1280, 1024×1024, etc.) |
| Seed | Manual or random |
| Prompt Expansion | Toggle AI-enhanced prompt expansion |

**Output:** Generated image stored in Supabase Storage, tracked in `image_edits` table.

#### 3.2.2 Video Generation Mode
| Parameter | Options |
|-----------|---------|
| Model | Flash (`wan-2.6/image-to-video-flash`) or Standard (`wan-2.6/image-to-video`) |
| Seed Image | Single input image (required) |
| Prompt / Negative Prompt | Text guidance |
| Resolution | 480p, 720p, 1080p |
| Duration | 1–10 seconds |
| Shot Type | Single or multi-shot |
| Audio | Enable/disable audio generation |
| Seed | Manual or random |
| Prompt Expansion | Toggle |

**Cost Estimation:**
- Flash model: $0.025–$0.075/sec (varies by resolution & audio)
- Standard model: $0.07–$0.15/sec (varies by resolution)

**Output:** Generated video (MP4) stored in Supabase Storage, tracked in `generations` table.

#### 3.2.3 Image Upscale Mode
| Parameter | Options |
|-----------|---------|
| Source Image | Single input image |
| Prompt | Enhancement guidance |
| Resolution | 1k, 2k, 4k |
| Aspect Ratio | Original, or custom |
| Output Format | PNG, JPG |

**Output:** Upscaled image stored in storage, tracked in `image_edits` table.

#### 3.2.4 Image Overlay / Composite Mode
| Parameter | Options |
|-----------|---------|
| Base Image | Background image |
| Overlay Image | Foreground image |
| Opacity | 0–100% |
| Scale | Percentage |
| Position | X/Y offset |

**Output:** Composited image via `composite-image` edge function.

#### 3.2.5 Polling & Status Tracking
- Asynchronous generation via Atlas API task submission
- Client-side polling (4-second interval) for status updates
- Auto-resume polling for "processing" jobs on page load
- Status progression: `queued → processing → completed / failed`

### 3.3 Library Page (`/library`)

| Feature | Details |
|---------|---------|
| Unified View | Shows both images and videos in one feed |
| Filtering | By status (all, completed, processing, failed), by type (image, video) |
| Search | Text search across prompts |
| Actions | Download, copy prompt, delete, re-generate, save to drive |
| Metadata | Shows cost, timestamp, model, parameters, seed, status |
| Pagination | Loads recent items with query limits |

### 3.4 Flows System — Automation Pipeline Builder

#### 3.4.1 Flows List Page (`/flows`)
| Feature | Details |
|---------|---------|
| Create Flow | Named multi-step pipeline |
| Duplicate Flow | Clone flow with all steps |
| Delete Flow | Remove flow and associated data |
| Flow Cards | Show step count, last execution status & timestamp |

#### 3.4.2 Flow Builder Page (`/flows/:flowId`)
| Feature | Details |
|---------|---------|
| Step Types | Image Generation, Video Generation, Image Upscale, Image Overlay |
| Step Configuration | Full parameter control per step (same as Create page) |
| Step Ordering | Numbered steps, add/remove/reorder |
| Input Chaining | Each step can consume the output of the previous step |
| Save | Persist step configurations to `flow_steps` table |
| Test Run | Execute the entire flow |

#### 3.4.3 Flow Runner Page (`/runner`)
| Feature | Details |
|---------|---------|
| Flow Selection | Pick from saved flows |
| Input Override | Supply initial seed images for the first step |
| Start Execution | Creates `flow_executions` and `flow_step_executions` records |
| Step Preview | Visual pipeline showing step types with arrows |

#### 3.4.4 Flow Execution Page (`/flows/:flowId/run/:execId`)
| Feature | Details |
|---------|---------|
| Live Tracking | Real-time step-by-step execution status |
| Step Results | Input/output artifact URLs per step |
| Error Handling | Per-step error messages |
| Download | Download individual step outputs |

#### 3.4.5 Executions Page (`/executions`)
| Feature | Details |
|---------|---------|
| Run History | All flow executions with status |
| Stop Run | Abort running executions |
| Delete Run | Remove execution records |
| Navigation | Click to view execution details |

### 3.5 Settings Page (`/settings`)

| Setting | Details |
|---------|---------|
| Atlas API Key | User-provided key for Atlas AI API |
| Default Mode | Video or Image |
| Video Defaults | Model, resolution, duration, shot type, seed, prompt expansion, audio |
| Image Defaults | Model, output size, prompt expansion |
| Prompt Block Manager | Create/manage reusable prompt snippets by category |
| Seed Image Drive | Manage uploaded seed images |
| Sign Out | End session |

### 3.6 Prompt Blocks System

| Feature | Details |
|---------|---------|
| Categories | Organized prompt snippets (e.g., style, lighting, camera) |
| Built-in Blocks | Pre-loaded system blocks |
| Custom Blocks | User-created blocks |
| Preferences | Per-user hide/show and sort order per block/category |
| Insertion | Click-to-insert into prompt fields on Create page |

### 3.7 Seed Image Management

| Feature | Details |
|---------|---------|
| Upload | Upload images to Supabase Storage |
| Browse | Grid view of uploaded seed images |
| Select | Pick seed images for generation inputs |
| Storage | `seed-images` public bucket |

---

## 4. Data Model

### Core Tables

| Table | Purpose |
|-------|---------|
| `user_settings` | Per-user defaults and API key |
| `projects` | Project containers for organizing work |
| `scenes` | Video scene definitions within projects |
| `generations` | Video generation jobs & results |
| `image_edits` | Image generation/edit jobs & results |
| `source_images` | Uploaded source/reference images |
| `characters` | Character definitions with prompt tokens |
| `batch_jobs` | Bulk generation jobs |
| `prompt_blocks` | Reusable prompt snippets |
| `user_prompt_block_prefs` | Per-user block visibility/ordering |
| `user_prompt_category_prefs` | Per-user category visibility/ordering |
| `flows` | Flow pipeline definitions |
| `flow_steps` | Individual steps within flows |
| `flow_executions` | Flow run instances |
| `flow_step_executions` | Per-step execution tracking |

### Storage

| Bucket | Contents |
|--------|----------|
| `seed-images` | Uploaded seed images, generated images, generated videos |

---

## 5. Edge Functions (Backend)

| Function | Purpose |
|----------|---------|
| `generate-image` | Submit image generation/edit to Atlas API, poll for results, store output |
| `generate-video` | Submit video generation to Atlas API, poll for results, store output |
| `upscale-image` | Submit image upscale to Atlas API, poll for results, store output |
| `composite-image` | Server-side image compositing (overlay with opacity/scale/position) |

All generation functions follow the pattern:
1. `action: "start"` — Validate input, call Atlas API, create DB record
2. `action: "poll"` — Check Atlas task status, download & store completed output

---

## 6. Navigation Structure

Mobile-first bottom navigation with 6 tabs:

| Tab | Route | Function |
|-----|-------|----------|
| Create | `/` | Main generation workspace |
| Library | `/library` | Browse all generated media |
| Build | `/flows` | Create/edit automation flows |
| Run | `/runner` | Execute saved flows |
| Running | `/executions` | Monitor active/past executions |
| Settings | `/settings` | Configuration & preferences |

---

## 7. Non-Functional Requirements

| Requirement | Implementation |
|-------------|---------------|
| Mobile-First | Bottom nav, responsive layouts, touch targets |
| Dark Theme | HSL-based design tokens, dark mode by default |
| Auth Security | RLS policies on all tables, JWT-based auth |
| File Persistence | All outputs stored in Supabase Storage (not ephemeral) |
| Cost Transparency | Real-time cost estimates before generation |
| Error Resilience | Auto-resume polling for interrupted generations |
| Download Support | Direct CDN download for large files (videos) |

---

## 8. External Dependencies

| Dependency | Purpose |
|------------|---------|
| Atlas API | AI model inference (image gen, video gen, upscale) |
| User API Key | Each user provides their own Atlas API key in Settings |

---

## 9. Future Considerations (Not Yet Implemented)

Based on existing routes/code stubs in the codebase:
- **Scene Editor** (`SceneEditorPage`) — Visual scene composition
- **Scenes Page** (`ScenesPage`) — Scene management
- **Image Editor** (`ImageEditorPage`) — In-app image editing
- **Review Page** (`ReviewPage`) — Generation review workflow
- **Queue Page** (`QueuePage`) — Job queue management
- **Projects Page** (`ProjectsPage`) — Multi-project organization
- **Gallery Page** (`GalleryPage`) — Curated gallery view

---

*Document generated from codebase analysis — March 2026*
