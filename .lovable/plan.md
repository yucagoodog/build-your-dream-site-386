## PNG Overlay Compositing Step (✅ Done)

A flow step type called **"Image Overlay"** that composites a transparent PNG overlay on top of a base image. Fully implemented across edge function, flow builder, and execution.

---

# AI Media Studio — Improvement Plan

## Research Findings (March 2026)

### Competitive Landscape
Leading AI visual apps (Runway, Leonardo, Midjourney, Adobe Firefly, ComfyUI, PixAI) share these patterns:
- **Prompt augmentation UX**: Style galleries, prompt rewrite, related prompts, prompt builders, parametrization (Nielsen Norman research)
- **Gallery-first experience**: Visual grid with instant preview, lightbox, and comparison views
- **Generation history**: Persistent prompt history with one-click re-run
- **Real-time feedback**: Progress bars with stage indicators, not just spinners
- **Batch operations**: Generate multiple variations from one prompt
- **Favorites/collections**: Star and organize outputs into folders
- **Mobile-native gestures**: Swipe between outputs, pinch-to-zoom, pull-to-refresh

### Mobile-First Best Practices (2025-2026)
- **Thumb-zone navigation**: Critical actions within bottom 40% of screen
- **Progressive disclosure**: Show essential controls first, advanced in collapsible sections
- **Skeleton loading**: Shimmer placeholders for all async content (✅ done)
- **Bottom sheets over modals**: Vaul drawer for all secondary UI
- **Touch targets ≥ 44px**: Apple HIG minimum (✅ done)
- **Smart defaults**: Pre-fill based on last successful generation

---

## Prioritized Improvement Roadmap

### Phase 1 — Quick Wins (High Impact, Low Effort)

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1.1 | **Prompt History & Quick Re-run** — Store last 20 prompts in localStorage, dropdown on textarea | 🔥 High | Low |
| 1.2 | **Generation Progress Bar** — Replace spinner with staged "Queued → Processing → Done" + elapsed time | 🔥 High | Low |
| 1.3 | **Favorites System** — ⭐ toggle on Library items, filter by favorites | 🔥 High | Medium |
| 1.4 | **Empty States** — Meaningful empty states with CTAs for Library, Flows, Executions | Medium | Low |
| 1.5 | **Create Page Progressive Disclosure** — Collapse advanced settings by default | 🔥 High | Low |

### Phase 2 — UX Refinements (Medium Effort)

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 2.1 | **Lightbox / Full-Screen Preview** — Click image → fullscreen with swipe, pinch-zoom, metadata overlay | 🔥 High | Medium |
| 2.2 | **Advanced Prompt Builder** — Visual token chips, "Surprise me" random prompt | Medium | Medium |
| 2.3 | **First-Time Onboarding** — Guided setup: API key → mode → first generation | Medium | Medium |
| 2.4 | **Comparison View** — Side-by-side / slider overlay for upscale before/after | Medium | Medium |
| 2.5 | **Keyboard Shortcuts** — Cmd+Enter generate, Cmd+K command palette | Medium | Low |

### Phase 3 — Power Features (Higher Effort)

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 3.1 | **Batch Generation** — 2-4 variations with different seeds from one prompt | 🔥 High | High |
| 3.2 | **Smart Prompt Enhancement** — Lovable AI rewrites user prompt, show before/after | 🔥 High | Medium |
| 3.3 | **Cost Dashboard** — Running total per day/week/month with breakdown | Medium | Medium |
| 3.4 | **Collections / Folders** — Organize Library into named collections | Medium | High |
| 3.5 | **Template Flows** — Pre-built flow templates users can clone | Medium | Medium |

---

## Recommended Next Actions

**Start with Phase 1 items 1.1, 1.2, 1.5** — these three changes will dramatically improve perceived quality with zero backend changes needed.
