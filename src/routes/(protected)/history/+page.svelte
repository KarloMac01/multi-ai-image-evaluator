<script lang="ts">
	import { untrack } from 'svelte';

	interface EvaluationItem {
		id: string;
		product_name: string;
		status: string;
		created: string;
		total_duration_ms: number;
	}

	let evaluations = $state<EvaluationItem[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);

	async function loadEvaluations() {
		try {
			isLoading = true;
			errorMessage = null;

			const response = await fetch('/api/evaluations');
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to load evaluations');
			}

			evaluations = data.evaluations || [];
		} catch (err) {
			console.error('Failed to load evaluations:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load evaluations';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		untrack(() => loadEvaluations());
	});
</script>

<svelte:head>
	<title>History | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Evaluation History</h1>
			<p class="mt-1 text-sm sm:text-base text-gray-600">
				View and manage your past product label evaluations
			</p>
		</div>
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

	<!-- Content -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		{#if isLoading}
			<div class="p-8 sm:p-12 text-center">
				<div
					class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
				></div>
				<p class="mt-4 text-gray-600">Loading evaluations...</p>
			</div>
		{:else if evaluations.length === 0}
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
			<!-- Evaluation list -->
			<div class="divide-y divide-gray-200">
				{#each evaluations as evaluation (evaluation.id)}
					<a
						href="/evaluation/{evaluation.id}"
						class="block p-4 sm:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
						style="touch-action: manipulation;"
					>
						<div class="flex items-center justify-between">
							<div class="flex-1 min-w-0">
								<p class="text-sm sm:text-base font-medium text-gray-900 truncate">
									{evaluation.product_name || 'Unnamed Product'}
								</p>
								<p class="mt-1 text-xs sm:text-sm text-gray-500">
									{new Date(evaluation.created).toLocaleDateString()} at {new Date(
										evaluation.created
									).toLocaleTimeString()}
								</p>
							</div>
							<div class="ml-4 flex items-center space-x-4">
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {evaluation.status ===
									'completed'
										? 'bg-green-100 text-green-800'
										: evaluation.status === 'failed'
											? 'bg-red-100 text-red-800'
											: 'bg-yellow-100 text-yellow-800'}"
								>
									{evaluation.status}
								</span>
								<svg
									class="h-5 w-5 text-gray-400"
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
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
