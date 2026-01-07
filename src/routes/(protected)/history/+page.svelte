<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import type { AIProvider } from '$lib/pocketbase/types';
	import type { EvaluationListItem, PaginationInfo } from './+page';

	// Props from load function
	let { data } = $props();

	// Reactive data from load function
	let evaluations = $derived(data.evaluations);
	let pagination = $derived(data.pagination);
	let errorMessage = $derived(data.error);

	// Loading state for refresh
	let isRefreshing = $state(false);

	// Lightbox state
	let lightboxOpen = $state(false);
	let lightboxImageUrl = $state('');
	let lightboxProductName = $state('');

	// AI Provider configuration
	const AI_PROVIDERS: AIProvider[] = ['gemini', 'groq', 'claude', 'openai', 'cloudvision'];

	const providerInfo: Record<AIProvider, { name: string; shortName: string; color: string }> = {
		gemini: { name: 'Google Gemini', shortName: 'Gemini', color: 'bg-blue-100 text-blue-800' },
		groq: { name: 'Groq', shortName: 'Groq', color: 'bg-orange-100 text-orange-800' },
		claude: { name: 'Anthropic Claude', shortName: 'Claude', color: 'bg-purple-100 text-purple-800' },
		openai: { name: 'OpenAI', shortName: 'OpenAI', color: 'bg-green-100 text-green-800' },
		cloudvision: { name: 'Cloud Vision', shortName: 'Vision', color: 'bg-cyan-100 text-cyan-800' }
	};

	// Helper functions
	function getProviderResult(evaluation: EvaluationListItem, provider: AIProvider) {
		return evaluation.aiResults.find((r) => r.provider === provider);
	}

	function formatDuration(ms?: number): string {
		if (!ms) return '—';
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function getStatusStyle(status?: string): { bg: string; icon: 'check' | 'x' | 'spinner' | 'dash' } {
		switch (status) {
			case 'completed':
				return { bg: 'bg-green-100 text-green-600', icon: 'check' };
			case 'failed':
				return { bg: 'bg-red-100 text-red-600', icon: 'x' };
			case 'processing':
				return { bg: 'bg-yellow-100 text-yellow-600', icon: 'spinner' };
			default:
				return { bg: 'bg-gray-100 text-gray-400', icon: 'dash' };
		}
	}

	// Pagination helpers
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

	function goToPage(page: number) {
		goto(`/history?page=${page}`);
	}

	// Refresh handler
	async function handleRefresh() {
		isRefreshing = true;
		await invalidate('app:evaluations');
		isRefreshing = false;
	}

	// Lightbox functions
	function openLightbox(imageUrl: string, productName: string) {
		lightboxImageUrl = imageUrl;
		lightboxProductName = productName || 'Product Image';
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
</script>

<svelte:head>
	<title>History | Multi-AI Label Evaluator</title>
</svelte:head>

<svelte:window onkeydown={handleLightboxKeydown} />

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Evaluation History</h1>
			<p class="mt-1 text-sm sm:text-base text-gray-600">
				View and manage your past product label evaluations
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={handleRefresh}
				disabled={isRefreshing}
				class="inline-flex items-center justify-center px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
				title="Refresh list"
			>
				<svg
					class="h-5 w-5 {isRefreshing ? 'animate-spin' : ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			</button>
			<a
				href="/"
				class="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base"
				style="touch-action: manipulation;"
			>
				<svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Evaluation
			</a>
		</div>
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
			<p class="text-sm text-red-700">{errorMessage}</p>
		</div>
	{/if}

	<!-- Content -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		{#if evaluations.length === 0 && !errorMessage}
			<div class="p-8 sm:p-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-medium text-gray-900">No evaluations yet</h3>
				<p class="mt-2 text-gray-600">Get started by uploading your first product label.</p>
				<a
					href="/"
					class="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					style="touch-action: manipulation;"
				>
					Upload Label
				</a>
			</div>
		{:else}
			<!-- Desktop Table View -->
			<div class="hidden md:block overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								scope="col"
								class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
							>
								Image
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
							>
								Product
							</th>
							{#each AI_PROVIDERS as provider}
								<th
									scope="col"
									class="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider"
								>
									<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {providerInfo[provider].color}">
										{providerInfo[provider].shortName}
									</span>
								</th>
							{/each}
							<th
								scope="col"
								class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
							>
								Details
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each evaluations as evaluation (evaluation.id)}
							<tr class="hover:bg-gray-50">
								<!-- Thumbnail -->
								<td class="px-4 py-3">
									{#if evaluation.thumbnailUrl}
										<button
											type="button"
											onclick={() => openLightbox(evaluation.imageUrl, evaluation.product_name || '')}
											class="cursor-zoom-in group"
											aria-label="View full image"
										>
											<img
												src={evaluation.thumbnailUrl}
												alt={evaluation.product_name || 'Product'}
												class="w-12 h-12 object-cover rounded border border-gray-200 group-hover:border-blue-400 transition-colors"
											/>
										</button>
									{:else}
										<div class="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
											<svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
										</div>
									{/if}
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
									<td class="px-2 py-3 text-center">
										<div class="flex flex-col items-center gap-0.5">
											<span
												class="inline-flex items-center justify-center w-6 h-6 rounded-full {style.bg}"
											>
												{#if style.icon === 'check'}
													<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else if style.icon === 'x'}
													<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else if style.icon === 'spinner'}
													<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle
															class="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															stroke-width="4"
														></circle>
														<path
															class="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
														></path>
													</svg>
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
										<svg
											class="w-5 h-5 text-gray-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile List View -->
			<div class="md:hidden divide-y divide-gray-200">
				{#each evaluations as evaluation (evaluation.id)}
					<div class="p-4 hover:bg-gray-50">
						<div class="flex items-start gap-3">
							<!-- Thumbnail -->
							{#if evaluation.thumbnailUrl}
								<button
									type="button"
									onclick={() => openLightbox(evaluation.imageUrl, evaluation.product_name || '')}
									class="flex-shrink-0 cursor-zoom-in"
									aria-label="View full image"
								>
									<img
										src={evaluation.thumbnailUrl}
										alt={evaluation.product_name || 'Product'}
										class="w-16 h-16 object-cover rounded border border-gray-200"
									/>
								</button>
							{:else}
								<div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
									<svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</div>
							{/if}

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<a href="/evaluation/{evaluation.id}" class="block">
									<p class="text-sm font-medium text-gray-900 truncate">
										{evaluation.product_name || 'Unnamed Product'}
									</p>
									<p class="text-xs text-gray-500">
										{new Date(evaluation.created).toLocaleDateString()} at {new Date(
											evaluation.created
										).toLocaleTimeString()}
									</p>

									<!-- AI Status Pills -->
									<div class="mt-2 flex flex-wrap gap-1">
										{#each evaluation.aiResults as result}
											{@const style = getStatusStyle(result.status)}
											<span
												class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs {style.bg}"
											>
												{#if style.icon === 'check'}
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else if style.icon === 'x'}
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
												{providerInfo[result.provider].shortName}
											</span>
										{/each}
									</div>
								</a>
							</div>

							<!-- Caret -->
							<a href="/evaluation/{evaluation.id}" class="flex-shrink-0 p-2" aria-label="View evaluation details">
								<svg
									class="w-5 h-5 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</a>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if pagination && pagination.totalPages > 1}
				<div
					class="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6"
				>
					<!-- Mobile pagination -->
					<div class="flex flex-1 justify-between sm:hidden">
						<button
							onclick={() => goToPage(pagination.page - 1)}
							disabled={pagination.page <= 1}
							class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						<span class="self-center text-sm text-gray-700">
							{pagination.page} / {pagination.totalPages}
						</span>
						<button
							onclick={() => goToPage(pagination.page + 1)}
							disabled={pagination.page >= pagination.totalPages}
							class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>

					<!-- Desktop pagination -->
					<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Showing
								<span class="font-medium">{(pagination.page - 1) * pagination.perPage + 1}</span>
								to
								<span class="font-medium"
									>{Math.min(pagination.page * pagination.perPage, pagination.totalItems)}</span
								>
								of
								<span class="font-medium">{pagination.totalItems}</span> results
							</p>
						</div>
						<nav class="inline-flex -space-x-px rounded-md shadow-sm">
							<!-- Previous -->
							<button
								onclick={() => goToPage(pagination.page - 1)}
								disabled={pagination.page <= 1}
								class="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Previous page"
							>
								<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>

							<!-- Page numbers -->
							{#each getPageNumbers(pagination.page, pagination.totalPages) as pageNum}
								{#if pageNum === '...'}
									<span
										class="relative inline-flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300"
									>
										...
									</span>
								{:else}
									<button
										onclick={() => goToPage(pageNum as number)}
										class="relative inline-flex items-center px-4 py-2 text-sm font-medium border {pagination.page ===
										pageNum
											? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
											: 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
									>
										{pageNum}
									</button>
								{/if}
							{/each}

							<!-- Next -->
							<button
								onclick={() => goToPage(pagination.page + 1)}
								disabled={pagination.page >= pagination.totalPages}
								class="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Next page"
							>
								<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</nav>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Lightbox Modal -->
{#if lightboxOpen}
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
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
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
				src={lightboxImageUrl}
				alt={lightboxProductName}
				class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
			/>
		</div>

		<!-- Product name and instructions -->
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
			<div class="text-white font-medium mb-1">{lightboxProductName}</div>
			<div class="text-white/60 text-sm">Press ESC or click outside to close</div>
		</div>
	</div>
{/if}
