

## Problem

When you create a custom prompt block with a new category (e.g. "special"), it doesn't appear in the Prompt Library UI because of two issues:

1. **Pipeline filtering is too strict** (line 396-398): Categories are split by checking `cat.startsWith("img_")`. Any custom category that doesn't start with `img_` (like "special") only shows in the Video tab. And custom categories that don't start with `vid_` or match hardcoded video categories just get lumped into video by default.

2. **Category labels are lost on reload** (line 248): When creating a custom category, `ALL_CATEGORY_LABELS[resolvedCategory]` is set in memory, but this is a module-level constant -- it resets when the component remounts.

3. **Custom category form options are limited** (line 238-240): The "Add Custom" form only offers hardcoded `img_*` or `vid_*` categories plus "template". A user-created category like "special" won't appear as an option for future blocks.

## Plan

### 1. Fix pipeline filtering to include custom user blocks

Change the `filteredBlocks` logic to classify blocks into image/video properly:
- `img_*` categories → image pipeline
- `vid_*`, `template` categories → video pipeline  
- **Any other category** (user-created) → show in **both** pipeline tabs, or determine based on context

The simplest approach: show user-created blocks (where `is_builtin === false` and category doesn't match known prefixes) in the **currently active pipeline tab**, so they always appear.

### 2. Derive display labels from category slugs

Instead of relying on `ALL_CATEGORY_LABELS` for custom categories, add a fallback that converts slugs to title case (e.g. `special` → `Special`, `my_templates` → `My Templates`). This already partially works at line 208 (`ALL_CATEGORY_LABELS[category] || category`), but the raw slug isn't user-friendly.

### 3. Include existing custom categories in the "Add Custom" form

When building the category dropdown in `CustomPromptForm`, also include any existing user-created categories from the blocks data so users can add more blocks to their custom categories.

### Technical Details

**File: `src/components/PromptBlockManager.tsx`**

- **Line 31-40**: Add a helper function `formatCategoryLabel(slug)` that converts `snake_case` to `Title Case`.
- **Line 208**: Use the new helper instead of raw fallback.
- **Line 394-398**: Change `filteredBlocks` filter to also include blocks whose category doesn't match any known prefix (custom categories) regardless of pipeline.
- **Line 238-240**: In `CustomPromptForm`, scan existing blocks to find user-created categories and add them to the dropdown options.

