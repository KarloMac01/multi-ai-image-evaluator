# Development Iterations Log

This document tracks all the improvements and iterations made to the Multi-AI Product Label Evaluator codebase.

---

## Session: January 2025 - UI/UX Improvements

### Overview
This session focused on enhancing the evaluation detail page with better data visualization, user interaction, and mobile responsiveness.

---

## Iteration 1: Image Upload from URL

**Problem:** Users could only upload images from their local device.

**Solution:** Added URL input option for image upload alongside file upload.

**Files Changed:**
- `src/routes/(protected)/+page.svelte` - Added toggle between "Upload File" and "From URL" modes
- `src/routes/api/fetch-image/+server.ts` - New API endpoint to proxy image fetches (avoids CORS issues)

**Features:**
- Toggle switch between file upload and URL input
- Server-side image fetching with validation
- Content-type and size validation (max 10MB)
- Proper error handling for invalid URLs

---

## Iteration 2: Auto-refresh After Evaluation

**Problem:** Users had to manually refresh the page to see completed evaluation results.

**Solution:** Updated the realtime subscription handler to automatically reload data when evaluation completes.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Implementation:**
```typescript
// When evaluation status changes to completed or failed
if (e.record.status === 'completed' || e.record.status === 'failed') {
    cleanupSubscriptions();
    await loadEvaluation(); // Reload full data
}
```

---

## Iteration 3: Lightbox for Product Image

**Problem:** Product images were small and couldn't be viewed in detail.

**Solution:** Added lightbox functionality to view images full-screen.

**Files Changed:**
- `src/lib/components/ExtractedDataView.svelte` - Added lightbox to cards view
- `src/routes/(protected)/evaluation/[id]/+page.svelte` - Added lightbox to table view

**Features:**
- Click on image to open lightbox
- ESC key to close
- Click outside to close
- Zoom-in cursor hint on hover
- Dark overlay background

**Key Code:**
```svelte
<svelte:window onkeydown={handleLightboxKeydown} />

{#if lightboxOpen && evaluation?.imageUrl}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <!-- Lightbox content -->
    </div>
{/if}
```

---

## Iteration 4: Re-evaluation Functionality

**Problem:** Users couldn't re-run AI analysis without creating a new evaluation.

**Solution:** Added buttons to re-evaluate individual AI providers or all providers at once.

**Files Changed:**
- `src/routes/api/evaluations/[id]/re-evaluate/+server.ts` - New API endpoint
- `src/routes/(protected)/evaluation/[id]/+page.svelte` - UI buttons

**Features:**
- Individual "Re-run" button for each AI provider
- "Re-evaluate All" button beside status badge
- Loading states during re-evaluation
- Deletes old results before creating new ones

**API Endpoint:**
```typescript
POST /api/evaluations/[id]/re-evaluate
Body: { providers?: AIProvider[] } // Optional, defaults to all
```

---

## Iteration 5: Duration Display in Seconds

**Problem:** All durations were displayed in milliseconds, which is not user-friendly.

**Solution:** Converted all duration displays from milliseconds to seconds.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`
- `src/routes/(protected)/history/+page.svelte`

**Before:** `1234ms`
**After:** `1.23s`

---

## Iteration 6: Table Comparison View

**Problem:** Card-based view required clicking each provider to see details, making comparison difficult.

**Solution:** Added a table view for side-by-side comparison of all AI results.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Features:**
- Toggle between Table and Cards view (defaults to Table)
- X-axis: AI models (excluding failed ones)
- Y-axis: Data fields for comparison
- Product image at top of table
- Sticky first column for field names
- Provider badges with duration in header

**Key Derived States:**
```typescript
const successfulResults = $derived(
    aiResults.filter(r => r.status === 'completed' && r.extracted_data)
);

const comparisonFields = $derived.by(() => {
    // Collect and sort all unique field keys
});
```

---

## Iteration 7: Expand Nested Objects (Cannabis Facts, etc.)

**Problem:** Nested objects like `cannabis_facts`, `drug_facts`, and `supplement_facts` were collapsed and hard to compare.

**Solution:** Expanded nested objects as separate sections in the comparison table.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Features:**
- Section headers with emerald gradient styling
- Indented subfields with bullet indicators
- Collects all subfields from all AI results
- Handles missing data gracefully

**Key Code:**
```typescript
const nestedFields = ['cannabis_facts', 'drug_facts', 'supplement_facts'];

const expandedNestedFields = $derived.by(() => {
    // For each nested field, collect all subfields from all results
    // Return sections with name, label, and fields array
});

function getNestedValue(result, nestedField, subField) {
    // Safely retrieve nested values
}
```

---

## Iteration 8: User-Friendly Data Rendering

**Problem:** Array and object values were displayed as raw JSON, which looked unprofessional.

**Solution:** Created a rendering snippet that displays data in a user-friendly format.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Rendering Rules:**

| Type | Display Format |
|------|---------------|
| Empty/null | Gray em dash (—) |
| String/Number | Plain text |
| Boolean | Green checkmark + "Yes" or gray X + "No" |
| Array (1 item) | Single item as text |
| Array (2-8 items) | Bullet list with blue dots |
| Array (9+ items) | Collapsible with "Show all X items" |
| Object (1-6 fields) | Key: Value pairs |
| Object (7+ fields) | Collapsible with "Show all X fields" |

**Key Functions:**
```typescript
function isEmpty(value: unknown): boolean
function getValueType(value: unknown): 'empty' | 'string' | 'number' | 'boolean' | 'array' | 'object'
function formatSimpleValue(value: unknown): string
function formatArrayItem(item: unknown): string
function getObjectEntries(value: unknown): [string, unknown][]
```

**Snippet:**
```svelte
{#snippet renderCellValue(value: unknown)}
    {@const valueType = getValueType(value)}
    {#if valueType === 'array'}
        <!-- Render as bullet list or collapsible -->
    {:else if valueType === 'object'}
        <!-- Render as key-value pairs or collapsible -->
    {/if}
{/snippet}
```

---

## Iteration 9: Full Array Display with Expand/Collapse

**Problem:** Long arrays were truncated, hiding important information.

**Solution:** Show all array items, with collapsible UI for very long arrays (9+ items).

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Features:**
- Arrays up to 8 items show all items by default
- Arrays with 9+ items use `<details>` element for expand/collapse
- Native HTML expand/collapse (no JavaScript state needed)
- Arrow icon rotates when expanded
- Blue left border indicates expanded content

---

## Iteration 10: Hide Empty Table Rows

**Problem:** Table showed rows even when no AI model had data for that field, cluttering the view.

**Solution:** Filter out fields where all models have no data.

**Files Changed:**
- `src/routes/(protected)/evaluation/[id]/+page.svelte`

**Implementation:**
```typescript
// Check if at least one result has data for a field
function hasDataForField(field: string): boolean {
    return successfulResults.some(result => {
        const value = result.extracted_data?.[field];
        return !isEmpty(value);
    });
}

// Check if at least one result has data for a nested field
function hasDataForNestedField(nestedField: string, subField: string): boolean {
    return successfulResults.some(result => {
        const nestedData = result.extracted_data?.[nestedField];
        if (nestedData && typeof nestedData === 'object') {
            const value = nestedData[subField];
            return !isEmpty(value);
        }
        return false;
    });
}

// Filter fields in derived states
const comparisonFields = $derived.by(() => {
    // ... collect fields ...
    return fields.filter(field => hasDataForField(field));
});
```

---

## Summary of All Changes

### New Files Created
| File | Purpose |
|------|---------|
| `src/routes/api/fetch-image/+server.ts` | Proxy for fetching images from URLs |
| `src/routes/api/evaluations/[id]/re-evaluate/+server.ts` | Re-evaluation API endpoint |

### Modified Files
| File | Changes |
|------|---------|
| `src/routes/(protected)/+page.svelte` | URL upload option |
| `src/routes/(protected)/evaluation/[id]/+page.svelte` | Table view, lightbox, re-evaluation, data rendering |
| `src/lib/components/ExtractedDataView.svelte` | Lightbox for cards view |

### Key Features Added
1. URL-based image upload
2. Auto-refresh on evaluation completion
3. Image lightbox (full-screen view)
4. Re-evaluation buttons (individual and all)
5. Duration in seconds
6. Table comparison view with toggle
7. Expanded nested objects (cannabis_facts, etc.)
8. User-friendly data rendering (no JSON)
9. Full array display with expand/collapse
10. Empty row filtering

---

## Technical Notes

### Svelte 5 Patterns Used
- `$state()` for reactive state
- `$derived()` and `$derived.by()` for computed values
- `{#snippet}` for reusable template fragments
- `{@render}` for rendering snippets
- `{@const}` for template-local constants

### Accessibility Improvements
- `aria-label` on icon-only buttons
- Keyboard navigation (ESC to close lightbox)
- Proper semantic HTML (`<details>`, `<summary>`, `<dl>`, `<dt>`, `<dd>`)

### Performance Considerations
- Derived states automatically update when dependencies change
- Native `<details>` element for expand/collapse (no JS state)
- Filtering happens at data level, not template level
