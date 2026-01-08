<script lang="ts">
	import { page, navigating } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { AIProvider } from '$lib/pocketbase/types';
	import ExtractedDataView from '$lib/components/ExtractedDataView.svelte';
	import type { EvaluationData, AIResultData } from './+page';

	// Track if we're navigating to another evaluation
	let isNavigating = $derived(
		navigating.to?.route?.id === '/(protected)/evaluation/[id]'
	);

	// Props from load function
	let { data } = $props();

	// Local reactive state for realtime updates (synced from props)
	let evaluation = $state<EvaluationData | null>(null);
	let aiResults = $state<AIResultData[]>([]);
	let errorMessage = $state<string | null>(null);

	// Sync local state when props change (navigation or initial load)
	$effect(() => {
		evaluation = data.evaluation;
		aiResults = data.aiResults;
		errorMessage = data.error;
	});

	// Navigation from load function
	let previousId = $derived(data.navigation.previousId);
	let nextId = $derived(data.navigation.nextId);

	let selectedProvider = $state<AIProvider | null>(null);

	// Polling state (replaces PocketBase subscriptions)
	let isPolling = $state(false);
	let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
	const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds

	// Re-evaluation state
	let isReEvaluating = $state(false);
	let reEvaluatingProviders = $state<Set<AIProvider>>(new Set());

	// View mode: 'cards' or 'table'
	let viewMode: 'cards' | 'table' = $state('table');

	// Lightbox state
	let lightboxOpen = $state(false);

	function openLightbox() {
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

	// Get successful results only (for table view)
	const successfulResults = $derived(aiResults.filter(r => r.status === 'completed' && r.extracted_data));

	// Nested object fields that should be expanded into their own table sections
	const nestedFields = ['cannabis_facts', 'cannabis_info', 'drug_facts', 'supplement_facts'];

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
			if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
				const value = (nestedData as Record<string, unknown>)[subField];
				return !isEmpty(value);
			}
			return false;
		});
	}

	// Get all unique field keys from successful results for comparison
	const comparisonFields = $derived.by(() => {
		const fieldSet = new Set<string>();
		const fieldOrder = [
			'product_name', 'brand', 'manufacturer', 'formulation_type', 'net_contents',
			'ndc_code', 'upc_code', 'lot_number', 'expiration_date',
			'dosage_instructions', 'directions',
			'warnings_contraindications', 'drug_interactions', 'storage_conditions'
		];

		// Collect all fields from all results
		for (const result of successfulResults) {
			if (result.extracted_data) {
				Object.keys(result.extracted_data).forEach(key => {
					// Skip internal fields and nested objects (handled separately)
					if (key !== '_raw_ocr_text' && !nestedFields.includes(key)) {
						fieldSet.add(key);
					}
				});
			}
		}

		// Sort fields by predefined order, then alphabetically for others
		const fields = Array.from(fieldSet);
		fields.sort((a, b) => {
			const aIndex = fieldOrder.indexOf(a);
			const bIndex = fieldOrder.indexOf(b);
			if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
			if (aIndex >= 0) return -1;
			if (bIndex >= 0) return 1;
			return a.localeCompare(b);
		});

		// Filter out fields where all models have no data
		return fields.filter(field => hasDataForField(field));
	});

	// Get expanded nested fields (cannabis_facts, drug_facts, supplement_facts)
	const expandedNestedFields = $derived.by(() => {
		const sections: { name: string; label: string; fields: string[] }[] = [];

		for (const nestedField of nestedFields) {
			const allSubFields = new Set<string>();

			// Collect all subfields from all results for this nested field
			for (const result of successfulResults) {
				const nestedData = result.extracted_data?.[nestedField];
				if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
					Object.keys(nestedData as Record<string, unknown>).forEach(key => {
						allSubFields.add(key);
					});
				}
			}

			if (allSubFields.size > 0) {
				// Filter out subfields where all models have no data
				const fieldsWithData = Array.from(allSubFields).filter(subField =>
					hasDataForNestedField(nestedField, subField)
				);

				if (fieldsWithData.length > 0) {
					sections.push({
						name: nestedField,
						label: formatFieldName(nestedField),
						fields: fieldsWithData
					});
				}
			}
		}

		return sections;
	});

	// Get nested field value
	function getNestedValue(result: AIResultData, nestedField: string, subField: string): unknown {
		const nestedData = result.extracted_data?.[nestedField];
		if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
			return (nestedData as Record<string, unknown>)[subField];
		}
		return undefined;
	}

	// Format field name for display
	function formatFieldName(key: string): string {
		return key
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Check if value is empty
	function isEmpty(value: unknown): boolean {
		if (value === null || value === undefined) return true;
		if (typeof value === 'string') return value.trim() === '';
		if (Array.isArray(value)) return value.length === 0;
		if (typeof value === 'object') return Object.keys(value as object).length === 0;
		return false;
	}

	// Get value type for rendering
	function getValueType(value: unknown): 'empty' | 'string' | 'number' | 'boolean' | 'array' | 'object' {
		if (isEmpty(value)) return 'empty';
		if (typeof value === 'string') return 'string';
		if (typeof value === 'number') return 'number';
		if (typeof value === 'boolean') return 'boolean';
		if (Array.isArray(value)) return 'array';
		if (typeof value === 'object') return 'object';
		return 'string';
	}

	// Format simple value for display (used for plain text rendering)
	function formatSimpleValue(value: unknown): string {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (Array.isArray(value)) {
			if (value.length === 0) return '';
			// Format array items, handling nested objects
			return value.map(item => formatSimpleValue(item)).join(', ');
		}
		if (typeof value === 'object') {
			// Format object as key-value pairs
			const entries = Object.entries(value as Record<string, unknown>);
			if (entries.length === 0) return '';
			return entries
				.map(([k, v]) => `${formatFieldName(k)}: ${formatSimpleValue(v)}`)
				.join('; ');
		}
		return String(value);
	}

	// Format array item for display
	function formatArrayItem(item: unknown): string {
		if (typeof item === 'string') return item;
		if (typeof item === 'number') return String(item);
		if (typeof item === 'boolean') return item ? 'Yes' : 'No';
		if (Array.isArray(item)) {
			return formatSimpleValue(item);
		}
		if (item && typeof item === 'object') {
			// For objects in arrays, try to get a meaningful representation
			const obj = item as Record<string, unknown>;
			if ('name' in obj) return String(obj.name);
			if ('value' in obj) return String(obj.value);
			if ('label' in obj) return String(obj.label);
			// Return key-value pairs using formatSimpleValue for nested values
			const entries = Object.entries(obj);
			return entries.map(([k, v]) => `${formatFieldName(k)}: ${formatSimpleValue(v)}`).join(', ');
		}
		return String(item);
	}

	// Get object entries for rendering
	function getObjectEntries(value: unknown): [string, unknown][] {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return Object.entries(value as Record<string, unknown>);
		}
		return [];
	}

	// Polling function to fetch latest evaluation data
	async function pollEvaluationStatus() {
		const evaluationId = page.params.id;
		if (!evaluationId) return;

		try {
			const response = await fetch(`/api/evaluations/${evaluationId}`);
			if (!response.ok) {
				console.error('Failed to poll evaluation status');
				return;
			}

			const data = await response.json();

			if (data.evaluation) {
				// Update evaluation data
				evaluation = data.evaluation;

				// Update AI results
				if (data.aiResults) {
					aiResults = data.aiResults;
				}

				// Stop polling if evaluation is completed or failed
				if (data.evaluation.status === 'completed' || data.evaluation.status === 'failed') {
					stopPolling();
					// Invalidate to ensure SvelteKit cache is updated
					await invalidate('app:evaluation');
				}
			}
		} catch (err) {
			console.error('Error polling evaluation status:', err);
		}
	}

	// Start polling for evaluation updates
	function startPolling() {
		if (isPolling) return;

		const evaluationId = page.params.id;
		if (!evaluationId) return;

		isPolling = true;
		console.log('Starting polling for evaluation:', evaluationId);

		// Poll immediately, then at intervals
		pollEvaluationStatus();
		pollingIntervalId = setInterval(pollEvaluationStatus, POLLING_INTERVAL_MS);
	}

	// Stop polling
	function stopPolling() {
		if (pollingIntervalId) {
			clearInterval(pollingIntervalId);
			pollingIntervalId = null;
		}
		isPolling = false;
		console.log('Polling stopped');
	}

	async function reEvaluateProvider(provider: AIProvider) {
		if (!evaluation || reEvaluatingProviders.has(provider)) return;

		reEvaluatingProviders = new Set([...reEvaluatingProviders, provider]);

		try {
			const response = await fetch(`/api/evaluations/${evaluation.id}/re-evaluate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providers: [provider] })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to start re-evaluation');
			}

			// Start polling to get updates
			startPolling();
		} catch (err) {
			console.error('Re-evaluation failed:', err);
			errorMessage = err instanceof Error ? err.message : 'Re-evaluation failed';
		} finally {
			reEvaluatingProviders = new Set([...reEvaluatingProviders].filter(p => p !== provider));
		}
	}

	async function reEvaluateAll() {
		if (!evaluation || isReEvaluating) return;

		isReEvaluating = true;

		try {
			const response = await fetch(`/api/evaluations/${evaluation.id}/re-evaluate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to start re-evaluation');
			}

			// Start polling to get updates
			startPolling();
		} catch (err) {
			console.error('Re-evaluation failed:', err);
			errorMessage = err instanceof Error ? err.message : 'Re-evaluation failed';
		} finally {
			isReEvaluating = false;
		}
	}

	// Start polling when evaluation is processing
	$effect(() => {
		if (evaluation && (evaluation.status === 'processing' || evaluation.status === 'pending')) {
			startPolling();
		}
	});

	// Cleanup polling when navigating away or evaluation ID changes
	$effect(() => {
		const currentId = page.params.id;
		return () => {
			// Stop polling when evaluation ID changes
			stopPolling();
		};
	});

	// Cleanup on component destroy
	onDestroy(() => {
		stopPolling();
	});

	// Provider display names and colors
	const providerInfo: Record<AIProvider, { name: string; color: string }> = {
		gemini: { name: 'Google Gemini', color: 'bg-blue-100 text-blue-800' },
		groq: { name: 'Groq', color: 'bg-orange-100 text-orange-800' },
		claude: { name: 'Anthropic Claude', color: 'bg-purple-100 text-purple-800' },
		openai: { name: 'OpenAI', color: 'bg-green-100 text-green-800' },
		cloudvision: { name: 'Cloud Vision', color: 'bg-cyan-100 text-cyan-800' }
	};
</script>

{#snippet renderCellValue(value: unknown)}
	{@const valueType = getValueType(value)}
	{#if valueType === 'empty'}
		<span class="text-gray-300">—</span>
	{:else if valueType === 'string' || valueType === 'number'}
		<span>{formatSimpleValue(value)}</span>
	{:else if valueType === 'boolean'}
		{#if value}
			<span class="inline-flex items-center gap-1 text-green-700">
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
				Yes
			</span>
		{:else}
			<span class="inline-flex items-center gap-1 text-gray-400">
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
				No
			</span>
		{/if}
	{:else if valueType === 'array'}
		{@const arr = value as unknown[]}
		{#if arr.length === 0}
			<span class="text-gray-300">—</span>
		{:else if arr.length === 1}
			<span>{formatArrayItem(arr[0])}</span>
		{:else if arr.length <= 8}
			<!-- Show all items for short arrays -->
			<ul class="list-none space-y-1">
				{#each arr as item, i (i)}
					<li class="flex items-start gap-1.5">
						<span class="text-blue-400 mt-0.5 flex-shrink-0">•</span>
						<span class="break-words">{formatArrayItem(item)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<!-- Collapsible for long arrays -->
			<details class="group">
				<summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 mb-1">
					<svg class="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					Show all {arr.length} items
				</summary>
				<ul class="list-none space-y-1 mt-1 pl-1 border-l-2 border-blue-100">
					{#each arr as item, i (i)}
						<li class="flex items-start gap-1.5">
							<span class="text-blue-400 mt-0.5 flex-shrink-0">•</span>
							<span class="break-words">{formatArrayItem(item)}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	{:else if valueType === 'object'}
		{@const entries = getObjectEntries(value)}
		{#if entries.length === 0}
			<span class="text-gray-300">—</span>
		{:else if entries.length <= 6}
			<!-- Show all fields for small objects -->
			<dl class="space-y-1">
				{#each entries as [key, val] (key)}
					<div class="flex flex-wrap gap-x-1.5">
						<dt class="text-gray-500 font-medium flex-shrink-0">{formatFieldName(key)}:</dt>
						<dd class="text-gray-700 break-words">{formatSimpleValue(val)}</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<!-- Collapsible for large objects -->
			<details class="group">
				<summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 mb-1">
					<svg class="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					Show all {entries.length} fields
				</summary>
				<dl class="space-y-1 mt-1 pl-1 border-l-2 border-blue-100">
					{#each entries as [key, val] (key)}
						<div class="flex flex-wrap gap-x-1.5">
							<dt class="text-gray-500 font-medium flex-shrink-0">{formatFieldName(key)}:</dt>
							<dd class="text-gray-700 break-words">{formatSimpleValue(val)}</dd>
						</div>
					{/each}
				</dl>
			</details>
		{/if}
	{/if}
{/snippet}

<svelte:head>
	<title>Evaluation {page.params.id} | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6">
	<!-- Navigation header -->
	<div class="flex items-center justify-between">
		<!-- Back button -->
		<a
			href="/history"
			class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
			style="touch-action: manipulation;"
			data-sveltekit-preload-data="hover"
		>
			<svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to History
		</a>

		<!-- Previous/Next navigation -->
		<div class="flex items-center gap-1">
			{#if previousId}
				<a
					href="/evaluation/{previousId}"
					class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
					style="touch-action: manipulation;"
					aria-label="Previous evaluation"
					data-sveltekit-preload-data="hover"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<span class="hidden sm:inline">Previous</span>
				</a>
			{:else}
				<span class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-300 cursor-not-allowed">
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<span class="hidden sm:inline">Previous</span>
				</span>
			{/if}

			<span class="text-gray-300 px-1">|</span>

			{#if nextId}
				<a
					href="/evaluation/{nextId}"
					class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
					style="touch-action: manipulation;"
					aria-label="Next evaluation"
					data-sveltekit-preload-data="hover"
				>
					<span class="hidden sm:inline">Next</span>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{:else}
				<span class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-300 cursor-not-allowed">
					<span class="hidden sm:inline">Next</span>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</span>
			{/if}
		</div>
	</div>

	{#if !evaluation}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h3 class="mt-4 text-lg font-medium text-gray-900">Evaluation not found</h3>
			<p class="mt-2 text-gray-600">The evaluation you're looking for doesn't exist or was deleted.</p>
			<a
				href="/history"
				class="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				style="touch-action: manipulation;"
			>
				View All Evaluations
			</a>
		</div>
	{:else}
		<!-- Evaluation details -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 relative">
			<!-- Loading overlay during navigation -->
			{#if isNavigating}
				<div class="absolute inset-0 bg-white/40 backdrop-blur-sm z-10 rounded-lg"></div>
			{/if}
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 class="text-xl sm:text-2xl font-bold text-gray-900">
						{evaluation.product_name || 'Unnamed Product'}
					</h1>
					<p class="mt-1 text-sm text-gray-500">
						Evaluated on {new Date(evaluation.created).toLocaleDateString()} at {new Date(
							evaluation.created
						).toLocaleTimeString()}
					</p>
				</div>
				<div class="flex items-center gap-2 self-start">
					{#if isPolling}
						<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							<span class="relative flex h-2 w-2">
								<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
								<span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
							</span>
							Updating
						</span>
					{/if}
					<span
						class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {evaluation.status ===
						'completed'
							? 'bg-green-100 text-green-800'
							: evaluation.status === 'failed'
								? 'bg-red-100 text-red-800'
								: 'bg-yellow-100 text-yellow-800'}"
					>
						{#if evaluation.status === 'processing'}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
							</svg>
						{/if}
						{evaluation.status}
					</span>
					<button
						type="button"
						onclick={reEvaluateAll}
						disabled={isReEvaluating || evaluation.status === 'processing'}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						title="Re-evaluate with all AI providers"
					>
						{#if isReEvaluating}
							<svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
							</svg>
						{:else}
							<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						{/if}
						Re-evaluate All
					</button>
				</div>
			</div>

			<!-- AI Results -->
			<div class="border-t border-gray-200 pt-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-gray-900">AI Analysis Results</h2>

					<!-- View Toggle -->
					{#if aiResults.length > 0}
						<div class="flex border border-gray-200 rounded-lg overflow-hidden">
							<button
								type="button"
								onclick={() => viewMode = 'table'}
								class="px-3 py-1.5 text-xs font-medium transition-colors {viewMode === 'table'
									? 'bg-blue-600 text-white'
									: 'bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<span class="flex items-center gap-1.5">
									<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
									Table
								</span>
							</button>
							<button
								type="button"
								onclick={() => viewMode = 'cards'}
								class="px-3 py-1.5 text-xs font-medium transition-colors {viewMode === 'cards'
									? 'bg-blue-600 text-white'
									: 'bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<span class="flex items-center gap-1.5">
									<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
									Cards
								</span>
							</button>
						</div>
					{/if}
				</div>

				{#if aiResults.length === 0}
					{#if evaluation.status === 'processing' || evaluation.status === 'pending'}
						<div class="text-center py-8">
							<div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
							<p class="mt-4 text-gray-600">Analyzing image with AI providers...</p>
							<p class="mt-1 text-sm text-gray-500">Results will appear here as they complete</p>
						</div>
					{:else}
						<p class="text-gray-600">No AI results available.</p>
					{/if}
				{:else}
					{#if viewMode === 'table'}
						<!-- Table Comparison View -->
						<div class="space-y-6">
							<!-- Image at top -->
							{#if evaluation?.imageUrl}
								<div class="flex justify-center">
									<button
										type="button"
										onclick={openLightbox}
										class="cursor-zoom-in group relative"
										aria-label="View full size image"
									>
										<img
											src={evaluation.imageUrl}
											alt={evaluation.product_name || 'Product label'}
											class="max-h-64 rounded-lg border border-gray-200 shadow-sm object-contain transition-transform group-hover:scale-[1.02]"
										/>
										<div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
											<span class="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5">
												<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
												</svg>
												View
											</span>
										</div>
									</button>
								</div>
							{/if}

							{#if successfulResults.length === 0}
								<div class="text-center py-8 text-gray-500">
									<p>No successful AI results to compare.</p>
									<p class="text-sm mt-1">Results with errors are not shown in table view.</p>
								</div>
							{:else}
								<!-- Comparison Table -->
								<div class="overflow-x-auto border border-gray-200 rounded-lg">
									<table class="min-w-full divide-y divide-gray-200">
										<thead class="bg-gray-50">
											<tr>
												<th scope="col" class="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[150px]">
													Field
												</th>
												{#each successfulResults as result (result.id)}
													<th scope="col" class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[180px]">
														<div class="flex flex-col items-center gap-1">
															<span class="px-2 py-0.5 rounded text-xs font-medium {providerInfo[result.provider]?.color || 'bg-gray-100 text-gray-800'}">
																{providerInfo[result.provider]?.name || result.provider}
															</span>
															{#if result.duration_ms}
																<span class="text-xs text-gray-400 font-normal">{(result.duration_ms / 1000).toFixed(2)}s</span>
															{/if}
														</div>
													</th>
												{/each}
											</tr>
										</thead>
										<tbody class="bg-white divide-y divide-gray-200">
											{#each comparisonFields as field (field)}
												<tr class="hover:bg-gray-50">
													<td class="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
														{formatFieldName(field)}
													</td>
													{#each successfulResults as result (result.id)}
														<td class="px-4 py-3 text-sm text-gray-600 max-w-[300px] align-top">
															{@render renderCellValue(result.extracted_data?.[field])}
														</td>
													{/each}
												</tr>
											{/each}

											<!-- Expanded nested fields (cannabis_facts, drug_facts, supplement_facts) -->
											{#each expandedNestedFields as section (section.name)}
												<!-- Section header -->
												<tr class="bg-gradient-to-r from-emerald-50 to-teal-50">
													<td
														colspan={successfulResults.length + 1}
														class="sticky left-0 px-4 py-3 text-sm font-bold text-emerald-800 border-r border-gray-200"
													>
														<div class="flex items-center gap-2">
															<svg class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
															</svg>
															{section.label}
														</div>
													</td>
												</tr>
												<!-- Subfields -->
												{#each section.fields as subField (subField)}
													<tr class="hover:bg-emerald-50/50">
														<td class="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap pl-8">
															<span class="text-emerald-600">•</span> {formatFieldName(subField)}
														</td>
														{#each successfulResults as result (result.id)}
															{@const nestedValue = getNestedValue(result, section.name, subField)}
															<td class="px-4 py-3 text-sm text-gray-600 max-w-[300px] align-top">
																{@render renderCellValue(nestedValue)}
															</td>
														{/each}
													</tr>
												{/each}
											{/each}
										</tbody>
									</table>
								</div>

								<!-- Failed results summary -->
								{@const failedResults = aiResults.filter(r => r.status === 'failed')}
								{#if failedResults.length > 0}
									<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
										<p class="text-sm text-red-700 font-medium">Failed providers (not shown in table):</p>
										<div class="mt-2 flex flex-wrap gap-2">
											{#each failedResults as result (result.id)}
												<span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
													{providerInfo[result.provider]?.name || result.provider}
													<button
														type="button"
														onclick={() => reEvaluateProvider(result.provider)}
														disabled={reEvaluatingProviders.has(result.provider)}
														class="ml-1 hover:text-red-600"
														title="Retry {providerInfo[result.provider]?.name || result.provider}"
														aria-label="Retry {providerInfo[result.provider]?.name || result.provider}"
													>
														<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
														</svg>
													</button>
												</span>
											{/each}
										</div>
									</div>
								{/if}
							{/if}
						</div>
					{:else}
						<!-- Cards View (existing) -->
						<!-- Provider Summary Cards -->
						<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
							{#each aiResults as result (result.id)}
								<div class="border rounded-lg p-3 transition-all {selectedProvider === result.provider
										? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
										: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}">
									<button
										type="button"
										onclick={() => selectedProvider = selectedProvider === result.provider ? null : result.provider}
										class="w-full text-left"
									>
										<div class="flex items-center justify-between mb-2">
											<span class="px-2 py-0.5 rounded text-xs font-medium {providerInfo[result.provider]?.color || 'bg-gray-100 text-gray-800'}">
												{providerInfo[result.provider]?.name || result.provider}
											</span>
										</div>
										<div class="flex items-center gap-2">
											<span
												class="inline-flex items-center justify-center w-5 h-5 rounded-full {result.status === 'completed'
													? 'bg-green-100 text-green-600'
													: result.status === 'failed'
														? 'bg-red-100 text-red-600'
														: 'bg-yellow-100 text-yellow-600'}"
											>
												{#if result.status === 'completed'}
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
													</svg>
												{:else if result.status === 'failed'}
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
													</svg>
												{:else}
													<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
													</svg>
												{/if}
											</span>
											{#if result.duration_ms}
												<span class="text-xs text-gray-500">{(result.duration_ms / 1000).toFixed(2)}s</span>
											{/if}
										</div>
									</button>
									<!-- Re-evaluate button -->
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); reEvaluateProvider(result.provider); }}
										disabled={reEvaluatingProviders.has(result.provider) || evaluation?.status === 'processing'}
										class="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										title="Re-evaluate with {providerInfo[result.provider]?.name || result.provider}"
									>
										{#if reEvaluatingProviders.has(result.provider)}
											<svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
											</svg>
										{:else}
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
											</svg>
										{/if}
										Re-run
									</button>
								</div>
							{/each}
						</div>

						<!-- Selected Provider Detail View -->
						{#if selectedProvider}
							{@const selectedResult = aiResults.find(r => r.provider === selectedProvider)}
							{#if selectedResult}
								<div class="border border-gray-200 rounded-lg overflow-hidden">
									<div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
										<div class="flex items-center gap-3">
											<span class="px-3 py-1 rounded-lg text-sm font-medium {providerInfo[selectedResult.provider]?.color || 'bg-gray-100 text-gray-800'}">
												{providerInfo[selectedResult.provider]?.name || selectedResult.provider}
											</span>
											<span
												class="px-2 py-0.5 rounded-full text-xs font-medium {selectedResult.status === 'completed'
													? 'bg-green-100 text-green-800'
													: selectedResult.status === 'failed'
														? 'bg-red-100 text-red-800'
														: 'bg-yellow-100 text-yellow-800'}"
											>
												{selectedResult.status}
											</span>
										</div>
										{#if selectedResult.duration_ms}
											<span class="text-sm text-gray-500">
												{(selectedResult.duration_ms / 1000).toFixed(2)}s
												{#if selectedResult.tokens_used}
													&middot; {selectedResult.tokens_used} tokens
												{/if}
											</span>
										{/if}
									</div>

									<div class="p-4">
										{#if selectedResult.error_message}
											<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
												<p class="text-sm text-red-700">{selectedResult.error_message}</p>
											</div>
										{/if}

										{#if selectedResult.extracted_data}
											<ExtractedDataView data={selectedResult.extracted_data} imageUrl={evaluation?.imageUrl} />
										{:else}
											<p class="text-gray-500 text-center py-8">No extracted data available</p>
										{/if}
									</div>
								</div>
							{/if}
						{:else}
							<div class="border border-dashed border-gray-300 rounded-lg p-8 text-center">
								<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
								</svg>
								<p class="mt-4 text-gray-600">Click on a provider above to view detailed extraction results</p>
							</div>
						{/if}
					{/if}
				{/if}
			</div>

			<!-- Total duration -->
			{#if evaluation.total_duration_ms}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<p class="text-sm text-gray-600">
						Total processing time: <span class="font-medium">{(evaluation.total_duration_ms / 1000).toFixed(2)}s</span>
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Global keydown handler for lightbox -->
<svelte:window onkeydown={handleLightboxKeydown} />

<!-- Fixed loading spinner during navigation -->
{#if isNavigating}
	<div class="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
		<div class="flex flex-col items-center gap-3 bg-white/90 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg">
			<div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
			<span class="text-sm font-medium text-gray-700">Loading...</span>
		</div>
	</div>
{/if}

<!-- Lightbox Modal -->
{#if lightboxOpen && evaluation?.imageUrl}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
	>
		<!-- Close button -->
		<button
			type="button"
			onclick={closeLightbox}
			class="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
			aria-label="Close lightbox"
		>
			<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<!-- Backdrop click to close -->
		<button
			type="button"
			onclick={closeLightbox}
			class="absolute inset-0 cursor-zoom-out"
			aria-label="Close lightbox"
		></button>

		<!-- Image container -->
		<div class="relative max-w-[95vw] max-h-[95vh] p-4">
			<img
				src={evaluation.imageUrl}
				alt={evaluation.product_name || 'Product label'}
				class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
			/>
		</div>

		<!-- Instructions -->
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
			Press ESC or click outside to close
		</div>
	</div>
{/if}
