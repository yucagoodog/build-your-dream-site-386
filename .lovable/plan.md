

## Consolidated App Redesign: 3-Tab Architecture

### Current Problems
- 6 nav tabs, 2 empty placeholders (Queue, Review)
- Projects → Scenes → SceneEditor is 3 clicks before generating video
- Projects → Gallery is 2 clicks before generating images
- Upscale only available as a button on Library results
- Image Editor page (per-source-image) adds yet another layer

### New Architecture

```text
Bottom Nav:  [ Create ]  [ Library ]  [ Flows ]  [ Settings ]

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

### Implementation Steps (original 3-tab)

**1. Build unified Create page (`/`)**
- Three mode tabs: Image Edit, Video, Upscale
- Each mode shows its relevant controls inline
- Generate button calls the appropriate edge function
- Below the form: scrollable list of recent results

**2. Simplify Library page**
- Remove project-based filtering
- Keep type filter, status filter, search, sort

**3. Bottom nav: Create, Library, Flows, Settings**

**4. Clean up routes**
- Keep: `/` (Create), `/library`, `/flows`, `/flows/:id`, `/flows/:id/run/:execId`, `/settings`, `/auth`, `/reset-password`

**5-7.** Database, cleanup, edge functions — as previously implemented.

---

## Flow Generator – Implementation Plan

### Overview
Add a **Flows** tab (4th main nav item) that lets users chain Image Upscale → Image Generation → Video Generation steps into reusable, linear flows with deterministic execution.

### Database Schema

#### `flows`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | RLS owner |
| name | text NOT NULL | |
| description | text | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

#### `flow_steps`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| flow_id | uuid FK→flows | cascade delete |
| user_id | uuid NOT NULL | RLS owner |
| step_number | int NOT NULL | 1-indexed order |
| step_type | text NOT NULL | `image_upscale`, `image_generation`, `video_generation` |
| config | jsonb | prompt, model, resolution, duration, etc. |
| created_at | timestamptz | |

#### `flow_executions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| flow_id | uuid FK→flows | |
| user_id | uuid NOT NULL | |
| status | text | `pending`, `running`, `paused`, `completed`, `failed` |
| mode | text | `full_auto`, `step_by_step` |
| current_step | int | |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

#### `flow_step_executions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| execution_id | uuid FK→flow_executions | cascade delete |
| step_id | uuid FK→flow_steps | |
| user_id | uuid NOT NULL | |
| step_number | int | |
| status | text | `pending`, `running`, `completed`, `failed` |
| input_artifact_url | text | |
| output_artifact_url | text | |
| config_snapshot | jsonb | actual params at runtime |
| prompt_used | text | |
| error_message | text | |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

RLS: All tables `auth.uid() = user_id` for ALL.

### Frontend

#### Navigation
- Add `Workflow` icon + `/flows` to BottomNav (4th tab)
- Add routes: `/flows`, `/flows/:id` (builder), `/flows/:id/run/:execId` (execution)

#### FlowsPage (`/flows`)
- List of user's flows (name, step count, last run)
- Create new / duplicate / delete actions
- Tap a flow → FlowBuilderPage

#### FlowBuilderPage (`/flows/:id`)
- Vertical step stack — collapsible cards
- Each step card: type selector + full parameter controls (reuse Create page sections)
- Input auto-wired from previous step's output
- Add/remove/reorder steps
- Save template button
- "Run" button → choose mode (Full Auto / Step-by-Step) → create execution → navigate to run page

#### FlowExecutionPage (`/flows/:id/run/:execId`)
- Progress indicator per step
- Artifact preview after each step
- Re-run from any step
- Step-by-step: "Continue" button to advance
- Execution log/history

### Orchestration
- Client-side loop: call existing edge functions → poll → persist artifact → next step
- No in-memory artifact passing — only persisted URLs
- On failure: stop immediately, mark execution as failed

### Implementation Order
1. Database migration (4 tables + RLS)
2. Navigation + FlowsPage (list)
3. FlowBuilderPage (template editor)
4. FlowExecutionPage (run + monitor)
5. Orchestration logic (chaining)

### Out of Scope (MVP)
- Variables / branching / loops / parallel execution
- Flow marketplace
- Conditional logic
