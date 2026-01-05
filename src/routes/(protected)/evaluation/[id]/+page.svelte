<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { untrack } from 'svelte';
	import type { AIProvider } from '$lib/pocketbase/types';
	import ExtractedDataView from '$lib/components/ExtractedDataView.svelte';
	import { getClientPB, COLLECTIONS } from '$lib/pocketbase/client';

	interface EvaluationData {
		id: string;
		product_name: string;
		status: string;
		created: string;
		total_duration_ms: number;
		imageUrl: string;
		image: string;
	}

	interface AIResultData {
		id: string;
		provider: AIProvider;
		status: string;
		extracted_data?: Record<string, unknown>;
		formulation?: Record<string, unknown>;
		duration_ms?: number;
		error_message?: string;
		tokens_used?: number;
	}

	let isLoading = $state(true);
	let evaluation = $state<EvaluationData | null>(null);
	let aiResults = $state<AIResultData[]>([]);
	let errorMessage = $state<string | null>(null);
	let selectedProvider = $state<AIProvider | null>(null);
	let isSubscribed = $state(false);
	let subscribedEvaluationId: string | null = null;

	async function loadEvaluation() {
		try {
			isLoading = true;
			errorMessage = null;

			const response = await fetch(`/api/evaluations/${page.params.id}`);
			const data = await response.json();

			if (!response.ok) {
				if (response.status === 404) {
					evaluation = null;
					return;
				}
				throw new Error(data.message || 'Failed to load evaluation');
			}

			evaluation = data.evaluation;
			aiResults = data.aiResults || [];

			// Set up realtime subscriptions if evaluation is still processing
			if (evaluation && (evaluation.status === 'processing' || evaluation.status === 'pending')) {
				await setupRealtimeSubscriptions();
			}
		} catch (err) {
			console.error('Failed to load evaluation:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load evaluation';
			evaluation = null;
		} finally {
			isLoading = false;
		}
	}

	async function setupRealtimeSubscriptions() {
		if (isSubscribed) return;

		const evaluationId = page.params.id;
		if (!evaluationId) return;

		try {
			const pb = getClientPB();
			subscribedEvaluationId = evaluationId;

			// Subscribe to evaluation changes
			pb.collection(COLLECTIONS.EVALUATIONS).subscribe(
				evaluationId,
				(e) => {
					console.log('Evaluation updated:', e.action, e.record);
					if (e.action === 'update' && evaluation) {
						// Update evaluation data
						evaluation = {
							...evaluation,
							status: e.record.status,
							product_name: e.record.product_name,
							total_duration_ms: e.record.total_duration_ms
						};

						// If completed or failed, unsubscribe
						if (e.record.status === 'completed' || e.record.status === 'failed') {
							cleanupSubscriptions();
						}
					}
				}
			);

			// Subscribe to new AI results for this evaluation
			pb.collection(COLLECTIONS.AI_RESULTS).subscribe(
				'*',
				(e) => {
					if (e.record.evaluation !== evaluationId) return;

					console.log('AI Result event:', e.action, e.record.provider);

					if (e.action === 'create') {
						// Add new result
						const newResult: AIResultData = {
							id: e.record.id,
							provider: e.record.provider,
							status: e.record.status,
							extracted_data: e.record.extracted_data,
							formulation: e.record.formulation,
							duration_ms: e.record.duration_ms,
							error_message: e.record.error_message,
							tokens_used: e.record.tokens_used
						};

						// Check if already exists (avoid duplicates)
						const exists = aiResults.some(r => r.id === newResult.id);
						if (!exists) {
							aiResults = [...aiResults, newResult];
						}
					} else if (e.action === 'update') {
						// Update existing result
						aiResults = aiResults.map(r =>
							r.id === e.record.id
								? {
										...r,
										status: e.record.status,
										extracted_data: e.record.extracted_data,
										formulation: e.record.formulation,
										duration_ms: e.record.duration_ms,
										error_message: e.record.error_message,
										tokens_used: e.record.tokens_used
									}
								: r
						);
					}
				}
			);

			isSubscribed = true;
			console.log('Realtime subscriptions active for evaluation:', evaluationId);
		} catch (err) {
			console.error('Failed to set up realtime subscriptions:', err);
		}
	}

	function cleanupSubscriptions() {
		if (!isSubscribed) return;

		try {
			const pb = getClientPB();

			// Unsubscribe from evaluation changes
			if (subscribedEvaluationId) {
				pb.collection(COLLECTIONS.EVALUATIONS).unsubscribe(subscribedEvaluationId);
			}

			// Unsubscribe from all AI results subscriptions
			pb.collection(COLLECTIONS.AI_RESULTS).unsubscribe('*');

			subscribedEvaluationId = null;
			isSubscribed = false;
			console.log('Realtime subscriptions cleaned up');
		} catch (err) {
			console.error('Error cleaning up subscriptions:', err);
		}
	}

	$effect(() => {
		untrack(() => loadEvaluation());
	});

	// Cleanup on component destroy
	onDestroy(() => {
		cleanupSubscriptions();
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

<svelte:head>
	<title>Evaluation {page.params.id} | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6">
	<!-- Back button -->
	<div>
		<a
			href="/history"
			class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
			style="touch-action: manipulation;"
		>
			<svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to History
		</a>
	</div>

	{#if isLoading}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
			<div
				class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
			></div>
			<p class="mt-4 text-gray-600">Loading evaluation...</p>
		</div>
	{:else if !evaluation}
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
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
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
					{#if isSubscribed}
						<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							<span class="relative flex h-2 w-2">
								<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
								<span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
							</span>
							Live
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
				</div>
			</div>

			<!-- AI Results -->
			<div class="border-t border-gray-200 pt-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">AI Analysis Results</h2>

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
					<!-- Provider Summary Cards -->
					<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
						{#each aiResults as result (result.id)}
							<button
								type="button"
								onclick={() => selectedProvider = selectedProvider === result.provider ? null : result.provider}
								class="border rounded-lg p-3 text-left transition-all {selectedProvider === result.provider
									? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
									: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
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
										<span class="text-xs text-gray-500">{result.duration_ms}ms</span>
									{/if}
								</div>
							</button>
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
											{selectedResult.duration_ms}ms
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
			</div>

			<!-- Total duration -->
			{#if evaluation.total_duration_ms}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<p class="text-sm text-gray-600">
						Total processing time: <span class="font-medium">{evaluation.total_duration_ms}ms</span>
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
