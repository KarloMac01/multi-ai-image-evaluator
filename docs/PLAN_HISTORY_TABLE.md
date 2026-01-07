# Plan: History List Table View Improvements

## Overview

Transform the evaluation history page from a simple list to a feature-rich table view with thumbnails, AI provider status columns, caching, and pagination.

---

## Requirements Summary

| Requirement | Description |
|-------------|-------------|
| Thumbnail | Display product label thumbnail in each row |
| Table Layout | X-axis: Product name + 5 AI model columns |
| Row Content | Thumbnail, product name, duration per AI provider |
| Lightbox | Click thumbnail to view full image |
| Details Caret | Last column opens evaluation details |
| Sort Order | Latest evaluated at top (already implemented) |
| Caching | Cache list to avoid fetch on each refresh |
| Pagination | Pagination controls above footer |
| Responsive | Table for desktop, existing list for mobile |

---

## Current State Analysis

### Current Files
- `src/routes/(protected)/history/+page.svelte` - Simple list view
- `src/routes/api/evaluations/+server.ts` - Returns paginated evaluations
- `src/lib/pocketbase/server.ts` - `serverPB.evaluations.list()` returns evaluations

### Current Data Structure
```typescript
interface EvaluationItem {
    id: string;
    product_name: string;
    status: string;
    created: string;
    total_duration_ms: number;
}
```

### Missing Data
- Image URL for thumbnail
- AI results per provider (status, duration)
- Pagination info not used in UI

---

## Implementation Plan

### Phase 1: Backend API Updates

#### 1.1 Update Evaluations List API

**File:** `src/routes/api/evaluations/+server.ts`

**Changes:**
- Fetch AI results for each evaluation
- Generate thumbnail URLs
- Return structured data with AI provider info

**New Response Structure:**
```typescript
interface EvaluationListItem {
    id: string;
    product_name: string;
    status: string;
    created: string;
    total_duration_ms: number;
    thumbnailUrl: string;
    imageUrl: string;  // Full size for lightbox
    aiResults: {
        provider: AIProvider;
        status: 'completed' | 'failed' | 'pending';
        duration_ms?: number;
    }[];
}

interface PaginatedResponse {
    success: boolean;
    evaluations: EvaluationListItem[];
    pagination: {
        page: number;
        perPage: number;
        totalPages: number;
        totalItems: number;
    };
}
```

**Implementation:**
```typescript
// For each evaluation, fetch AI results summary
const evaluationsWithResults = await Promise.all(
    result.items.map(async (eval) => {
        const aiResults = await serverPB.aiResults.getByEvaluation(eval.id);
        return {
            ...eval,
            thumbnailUrl: serverPB.evaluations.getImageUrl(eval, { thumb: '100x100' }),
            imageUrl: serverPB.evaluations.getImageUrl(eval),
            aiResults: aiResults.map(r => ({
                provider: r.provider,
                status: r.status,
                duration_ms: r.duration_ms
            }))
        };
    })
);
```

#### 1.2 Add Thumbnail URL Helper

**File:** `src/lib/pocketbase/server.ts`

**Changes:**
- Update `getImageUrl` to support thumbnail options

```typescript
getImageUrl(evaluation: Evaluation, options?: { thumb?: string }): string {
    if (!evaluation.image) return '';
    const pb = getServerPB();
    const url = pb.files.getURL(evaluation, evaluation.image, options);
    return url;
}
```

---

### Phase 2: Frontend - History Page Redesign

#### 2.1 Updated TypeScript Interfaces

**File:** `src/routes/(protected)/history/+page.svelte`

```typescript
interface AIResultSummary {
    provider: AIProvider;
    status: 'completed' | 'failed' | 'pending' | 'processing';
    duration_ms?: number;
}

interface EvaluationItem {
    id: string;
    product_name: string;
    status: string;
    created: string;
    total_duration_ms: number;
    thumbnailUrl: string;
    imageUrl: string;
    aiResults: AIResultSummary[];
}

interface PaginationInfo {
    page: number;
    perPage: number;
    totalPages: number;
    totalItems: number;
}
```

#### 2.2 State Management

```typescript
// Evaluations data
let evaluations = $state<EvaluationItem[]>([]);
let pagination = $state<PaginationInfo | null>(null);
let isLoading = $state(true);
let errorMessage = $state<string | null>(null);

// Pagination
let currentPage = $state(1);
const perPage = 10;

// Lightbox
let lightboxOpen = $state(false);
let lightboxImageUrl = $state('');
let lightboxProductName = $state('');

// Cache
let cacheKey = $state('');
let cachedData = $state<Map<string, { evaluations: EvaluationItem[]; pagination: PaginationInfo }>>(new Map());
```

#### 2.3 Caching Implementation

**Strategy:** Event-based invalidation with Svelte store + sessionStorage backup

**Why this approach:**
- **No time-based expiry** - Cache is valid until data changes
- **Event-based invalidation** - Clear cache when new evaluation is created
- **Svelte store** - Fast in-memory access during navigation
- **sessionStorage** - Survives page refresh within session
- **Manual refresh** - User can force reload via button

**Option A: Simple Svelte Store (Recommended)**

Best for SvelteKit because it integrates with the framework's reactivity:

```typescript
// src/lib/stores/evaluationCache.ts
import { writable } from 'svelte/store';

interface CacheData {
    evaluations: EvaluationItem[];
    pagination: PaginationInfo;
}

// In-memory cache per page
const cache = writable<Map<number, CacheData>>(new Map());

export const evaluationCache = {
    subscribe: cache.subscribe,

    get(page: number): CacheData | undefined {
        let data: CacheData | undefined;
        cache.subscribe(map => {
            data = map.get(page);
        })();
        return data;
    },

    set(page: number, data: CacheData): void {
        cache.update(map => {
            map.set(page, data);
            return map;
        });
    },

    invalidate(): void {
        cache.set(new Map());
    },

    invalidatePage(page: number): void {
        cache.update(map => {
            map.delete(page);
            return map;
        });
    }
};
```

**Option B: With sessionStorage Persistence**

For cache that survives page refresh:

```typescript
// src/lib/stores/evaluationCache.ts
import { browser } from '$app/environment';

const CACHE_KEY = 'evaluation_history_cache';

interface CacheData {
    evaluations: EvaluationItem[];
    pagination: PaginationInfo;
}

// Load from sessionStorage on init
function loadFromStorage(): Map<number, CacheData> {
    if (!browser) return new Map();
    try {
        const stored = sessionStorage.getItem(CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v as CacheData]));
        }
    } catch {
        // Ignore parse errors
    }
    return new Map();
}

// Save to sessionStorage
function saveToStorage(map: Map<number, CacheData>): void {
    if (!browser) return;
    try {
        const obj = Object.fromEntries(map);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch {
        // Ignore storage errors
    }
}

// In-memory cache with storage persistence
let cacheMap = loadFromStorage();

export const evaluationCache = {
    get(page: number): CacheData | undefined {
        return cacheMap.get(page);
    },

    set(page: number, data: CacheData): void {
        cacheMap.set(page, data);
        saveToStorage(cacheMap);
    },

    invalidate(): void {
        cacheMap = new Map();
        if (browser) {
            sessionStorage.removeItem(CACHE_KEY);
        }
    }
};
```

**Option C: SvelteKit Native Approach with `invalidate()`**

Use SvelteKit's built-in invalidation with `+page.ts` load function:

```typescript
// src/routes/(protected)/history/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url, depends }) => {
    // Register dependency for invalidation
    depends('app:evaluations');

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const response = await fetch(`/api/evaluations?page=${page}&perPage=10`);
    const data = await response.json();

    return {
        evaluations: data.evaluations,
        pagination: data.pagination
    };
};
```

```typescript
// When creating new evaluation, invalidate:
import { invalidate } from '$app/navigation';

async function onEvaluationCreated() {
    await invalidate('app:evaluations');
}
```

**Recommended: Option A + Manual Refresh Button**

Simple, effective, and follows SvelteKit patterns:
- Store handles in-memory caching
- Navigating between pages uses cache
- Refresh button calls `evaluationCache.invalidate()` + refetch
- New evaluation creation invalidates cache

#### 2.4 Data Loading with Cache

```typescript
import { evaluationCache } from '$lib/stores/evaluationCache';

async function loadEvaluations(page: number = 1, forceRefresh: boolean = false) {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cached = evaluationCache.get(page);
        if (cached) {
            evaluations = cached.evaluations;
            pagination = cached.pagination;
            currentPage = page;
            isLoading = false;
            return;
        }
    }

    try {
        isLoading = true;
        errorMessage = null;

        const response = await fetch(`/api/evaluations?page=${page}&perPage=${perPage}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load evaluations');
        }

        evaluations = data.evaluations || [];
        pagination = data.pagination;
        currentPage = page;

        // Cache the result (no expiry)
        evaluationCache.set(page, { evaluations, pagination });
    } catch (err) {
        console.error('Failed to load evaluations:', err);
        errorMessage = err instanceof Error ? err.message : 'Failed to load evaluations';
    } finally {
        isLoading = false;
    }
}

// Refresh button handler
function handleRefresh() {
    evaluationCache.invalidate();
    loadEvaluations(currentPage, true);
}
```

**Invalidate on new evaluation (in main page):**

```typescript
// src/routes/(protected)/+page.svelte
import { evaluationCache } from '$lib/stores/evaluationCache';
import { goto } from '$app/navigation';

async function handleEvaluationSuccess(evaluationId: string) {
    // Invalidate history cache since new data exists
    evaluationCache.invalidate();

    // Navigate to evaluation detail
    await goto(`/evaluation/${evaluationId}`);
}
```

---

### Phase 3: Table UI Component

#### 3.1 Provider Configuration

```typescript
const AI_PROVIDERS: AIProvider[] = ['gemini', 'groq', 'claude', 'openai', 'cloudvision'];

const providerInfo: Record<AIProvider, { name: string; shortName: string; color: string }> = {
    gemini: { name: 'Google Gemini', shortName: 'Gemini', color: 'bg-blue-100 text-blue-800' },
    groq: { name: 'Groq', shortName: 'Groq', color: 'bg-orange-100 text-orange-800' },
    claude: { name: 'Anthropic Claude', shortName: 'Claude', color: 'bg-purple-100 text-purple-800' },
    openai: { name: 'OpenAI', shortName: 'OpenAI', color: 'bg-green-100 text-green-800' },
    cloudvision: { name: 'Cloud Vision', shortName: 'Vision', color: 'bg-cyan-100 text-cyan-800' }
};
```

#### 3.2 Helper Functions

```typescript
// Get AI result for a specific provider
function getProviderResult(evaluation: EvaluationItem, provider: AIProvider): AIResultSummary | undefined {
    return evaluation.aiResults.find(r => r.provider === provider);
}

// Format duration
function formatDuration(ms?: number): string {
    if (!ms) return '—';
    return `${(ms / 1000).toFixed(1)}s`;
}

// Get status icon/color
function getStatusStyle(status?: string): { bg: string; icon: 'check' | 'x' | 'spinner' | 'dash' } {
    switch (status) {
        case 'completed': return { bg: 'bg-green-100 text-green-600', icon: 'check' };
        case 'failed': return { bg: 'bg-red-100 text-red-600', icon: 'x' };
        case 'processing': return { bg: 'bg-yellow-100 text-yellow-600', icon: 'spinner' };
        default: return { bg: 'bg-gray-100 text-gray-400', icon: 'dash' };
    }
}
```

#### 3.3 Lightbox Functions

```typescript
function openLightbox(imageUrl: string, productName: string) {
    lightboxImageUrl = imageUrl;
    lightboxProductName = productName;
    lightboxOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightboxOpen = false;
    document.body.style.overflow = '';
}

function handleLightboxKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && lightboxOpen) {
        closeLightbox();
    }
}
```

#### 3.4 Table Template (Desktop)

```svelte
<!-- Desktop Table View (hidden on mobile) -->
<div class="hidden md:block overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Image
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Product
                </th>
                {#each AI_PROVIDERS as provider}
                    <th class="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        <span class="px-2 py-0.5 rounded {providerInfo[provider].color}">
                            {providerInfo[provider].shortName}
                        </span>
                    </th>
                {/each}
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Details
                </th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
            {#each evaluations as evaluation (evaluation.id)}
                <tr class="hover:bg-gray-50">
                    <!-- Thumbnail -->
                    <td class="px-4 py-3">
                        <button
                            type="button"
                            onclick={() => openLightbox(evaluation.imageUrl, evaluation.product_name)}
                            class="cursor-zoom-in group"
                        >
                            <img
                                src={evaluation.thumbnailUrl}
                                alt={evaluation.product_name}
                                class="w-12 h-12 object-cover rounded border border-gray-200 group-hover:border-blue-400 transition-colors"
                            />
                        </button>
                    </td>

                    <!-- Product Name & Date -->
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900">
                            {evaluation.product_name || 'Unnamed Product'}
                        </div>
                        <div class="text-xs text-gray-500">
                            {new Date(evaluation.created).toLocaleDateString()}
                        </div>
                    </td>

                    <!-- AI Provider Columns -->
                    {#each AI_PROVIDERS as provider}
                        {@const result = getProviderResult(evaluation, provider)}
                        {@const style = getStatusStyle(result?.status)}
                        <td class="px-3 py-3 text-center">
                            <div class="flex flex-col items-center gap-1">
                                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full {style.bg}">
                                    {#if style.icon === 'check'}
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">...</svg>
                                    {:else if style.icon === 'x'}
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">...</svg>
                                    {:else if style.icon === 'spinner'}
                                        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">...</svg>
                                    {:else}
                                        <span class="text-xs">—</span>
                                    {/if}
                                </span>
                                <span class="text-xs text-gray-500">
                                    {formatDuration(result?.duration_ms)}
                                </span>
                            </div>
                        </td>
                    {/each}

                    <!-- Details Caret -->
                    <td class="px-4 py-3 text-center">
                        <a
                            href="/evaluation/{evaluation.id}"
                            class="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                            title="View details"
                        >
                            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
```

#### 3.5 Mobile List View (Existing, Enhanced)

```svelte
<!-- Mobile List View (visible only on mobile) -->
<div class="md:hidden divide-y divide-gray-200">
    {#each evaluations as evaluation (evaluation.id)}
        <div class="p-4 hover:bg-gray-50">
            <div class="flex items-start gap-3">
                <!-- Thumbnail -->
                <button
                    type="button"
                    onclick={() => openLightbox(evaluation.imageUrl, evaluation.product_name)}
                    class="flex-shrink-0 cursor-zoom-in"
                >
                    <img
                        src={evaluation.thumbnailUrl}
                        alt={evaluation.product_name}
                        class="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                </button>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <a href="/evaluation/{evaluation.id}" class="block">
                        <p class="text-sm font-medium text-gray-900 truncate">
                            {evaluation.product_name || 'Unnamed Product'}
                        </p>
                        <p class="text-xs text-gray-500">
                            {new Date(evaluation.created).toLocaleDateString()}
                        </p>

                        <!-- AI Status Pills -->
                        <div class="mt-2 flex flex-wrap gap-1">
                            {#each evaluation.aiResults as result}
                                {@const style = getStatusStyle(result.status)}
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs {style.bg}">
                                    {providerInfo[result.provider].shortName}
                                </span>
                            {/each}
                        </div>
                    </a>
                </div>

                <!-- Caret -->
                <a href="/evaluation/{evaluation.id}" class="flex-shrink-0 p-2">
                    <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>
        </div>
    {/each}
</div>
```

---

### Phase 4: Pagination Component

#### 4.1 Pagination UI

```svelte
<!-- Pagination (above footer) -->
{#if pagination && pagination.totalPages > 1}
    <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <!-- Mobile pagination -->
        <div class="flex flex-1 justify-between sm:hidden">
            <button
                onclick={() => loadEvaluations(currentPage - 1)}
                disabled={currentPage <= 1}
                class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <span class="self-center text-sm text-gray-700">
                Page {currentPage} of {pagination.totalPages}
            </span>
            <button
                onclick={() => loadEvaluations(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>

        <!-- Desktop pagination -->
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
                <p class="text-sm text-gray-700">
                    Showing <span class="font-medium">{(currentPage - 1) * perPage + 1}</span>
                    to <span class="font-medium">{Math.min(currentPage * perPage, pagination.totalItems)}</span>
                    of <span class="font-medium">{pagination.totalItems}</span> results
                </p>
            </div>
            <nav class="inline-flex -space-x-px rounded-md shadow-sm">
                <!-- Previous -->
                <button
                    onclick={() => loadEvaluations(currentPage - 1)}
                    disabled={currentPage <= 1}
                    class="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- Page numbers -->
                {#each getPageNumbers(currentPage, pagination.totalPages) as pageNum}
                    {#if pageNum === '...'}
                        <span class="relative inline-flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300">
                            ...
                        </span>
                    {:else}
                        <button
                            onclick={() => loadEvaluations(pageNum as number)}
                            class="relative inline-flex items-center px-4 py-2 text-sm font-medium border {currentPage === pageNum
                                ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
                        >
                            {pageNum}
                        </button>
                    {/if}
                {/each}

                <!-- Next -->
                <button
                    onclick={() => loadEvaluations(currentPage + 1)}
                    disabled={currentPage >= pagination.totalPages}
                    class="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            </nav>
        </div>
    </div>
{/if}
```

#### 4.2 Page Number Helper

```typescript
function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
        return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 2) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
}
```

---

### Phase 5: Lightbox Component

```svelte
<!-- Global keydown handler -->
<svelte:window onkeydown={handleLightboxKeydown} />

<!-- Lightbox Modal -->
{#if lightboxOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            onclick={closeLightbox}
            class="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/50 rounded-full z-10"
            aria-label="Close"
        >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <button
            type="button"
            onclick={closeLightbox}
            class="absolute inset-0 cursor-zoom-out"
            aria-label="Close"
        ></button>

        <div class="relative max-w-[95vw] max-h-[95vh] p-4">
            <img
                src={lightboxImageUrl}
                alt={lightboxProductName}
                class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
        </div>

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxProductName} — Press ESC to close
        </div>
    </div>
{/if}
```

---

## File Changes Summary

### Modified Files

| File | Changes |
|------|---------|
| `src/routes/api/evaluations/+server.ts` | Add AI results + image URLs to response |
| `src/lib/pocketbase/server.ts` | Add thumbnail option to `getImageUrl` |
| `src/routes/(protected)/history/+page.svelte` | Complete redesign with table, pagination, caching |

### New Components (Optional)

Consider extracting if file becomes too large:
- `src/lib/components/HistoryTable.svelte`
- `src/lib/components/Pagination.svelte`

---

## Implementation Order

1. **Backend First**
   - Update `getImageUrl` to support thumbnails
   - Update evaluations API to include AI results + image URLs

2. **Frontend Structure**
   - Add new TypeScript interfaces
   - Add caching functions
   - Update `loadEvaluations` with cache support

3. **UI Components**
   - Add lightbox state and functions
   - Add desktop table view
   - Enhance mobile list view with thumbnails
   - Add pagination component

4. **Testing**
   - Test with various data scenarios
   - Test responsive breakpoints
   - Test caching behavior
   - Test pagination navigation

---

## Responsive Breakpoints

| Breakpoint | View |
|------------|------|
| `< 768px` (md) | Mobile list view with thumbnails |
| `>= 768px` | Desktop table view with all columns |

---

## Caching Strategy

**Event-based invalidation (no time expiry)**

| Scenario | Behavior |
|----------|----------|
| Initial load | Check cache, fetch if miss |
| Page navigation | Check cache, fetch if miss |
| Refresh button | Force invalidate + refetch |
| New evaluation created | Invalidate all cache |
| Page refresh (browser) | sessionStorage restores cache (Option B) |

**Why no time-based expiry:**
- Data only changes when user creates evaluations
- User controls when to refresh via button
- Avoids arbitrary TTL that doesn't match data lifecycle
- Simpler implementation, fewer edge cases

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Backend | ~30 min |
| Phase 2: Frontend Structure | ~20 min |
| Phase 3: Table UI | ~45 min |
| Phase 4: Pagination | ~20 min |
| Phase 5: Lightbox | ~15 min |
| **Total** | **~2.5 hours** |

---

## Success Criteria

- [ ] Thumbnail visible in both table and list views
- [ ] Clicking thumbnail opens lightbox
- [ ] Table shows all 5 AI provider columns with status/duration
- [ ] Caret navigates to evaluation details
- [ ] Latest evaluations appear first
- [ ] Pagination works correctly
- [ ] Cache prevents refetch on page revisit
- [ ] Mobile shows list view
- [ ] Desktop shows table view
- [ ] Refresh button forces data reload
