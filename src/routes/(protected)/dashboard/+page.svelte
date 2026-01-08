<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SummaryCards from '$lib/components/dashboard/SummaryCards.svelte';
	import ProviderBarChart from '$lib/components/dashboard/ProviderBarChart.svelte';
	import FieldHeatmap from '$lib/components/dashboard/FieldHeatmap.svelte';
	import ConsensusDonut from '$lib/components/dashboard/ConsensusDonut.svelte';
	import TrendLineChart from '$lib/components/dashboard/TrendLineChart.svelte';

	let { data } = $props();

	const dashboard = $derived(data.dashboard);
	const error = $derived(data.error);
	const currentDays = $derived(data.days);

	async function changePeriod(days: number) {
		await goto(`/dashboard?days=${days}`, { replaceState: true });
	}
</script>

<svelte:head>
	<title>Dashboard | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="mt-1 text-sm text-gray-600">AI provider performance and consensus analysis</p>
		</div>

		<!-- Period selector -->
		<div class="flex border border-gray-200 rounded-lg overflow-hidden self-start">
			<button
				type="button"
				onclick={() => changePeriod(7)}
				class="px-4 py-2 text-sm font-medium transition-colors {currentDays === 7
					? 'bg-blue-600 text-white'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				7 Days
			</button>
			<button
				type="button"
				onclick={() => changePeriod(30)}
				class="px-4 py-2 text-sm font-medium transition-colors border-x border-gray-200 {currentDays === 30
					? 'bg-blue-600 text-white'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				30 Days
			</button>
			<button
				type="button"
				onclick={() => changePeriod(90)}
				class="px-4 py-2 text-sm font-medium transition-colors {currentDays === 90
					? 'bg-blue-600 text-white'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				90 Days
			</button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex items-center gap-3">
				<svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm text-red-700">{error}</p>
			</div>
		</div>
	{:else if dashboard}
		<!-- Summary Cards -->
		<SummaryCards
			totalEvaluations={dashboard.summary.totalEvaluations}
			completedEvaluations={dashboard.summary.completedEvaluations}
			averageProcessingTimeMs={dashboard.summary.averageProcessingTimeMs}
			overallConsensusRate={dashboard.summary.overallConsensusRate}
		/>

		<!-- Charts Row 1: Provider Performance & Consensus -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<ProviderBarChart providerStats={dashboard.providerStats} />
			<ConsensusDonut distribution={dashboard.consensusDistribution} />
		</div>

		<!-- Field Recognition Heatmap -->
		<FieldHeatmap fieldRecognition={dashboard.fieldRecognition} />

		<!-- Trend Chart -->
		<TrendLineChart trends={dashboard.trends} />

		<!-- Provider Details Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
			<h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">Provider Details</h3>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead>
						<tr>
							<th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pr-4">Provider</th>
							<th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Evaluations</th>
							<th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Success Rate</th>
							<th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Consensus Accuracy</th>
							<th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pl-4">Avg Time</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each dashboard.providerStats as stat (stat.provider)}
							{@const providerNames = {
								gemini: 'Google Gemini',
								groq: 'Groq',
								claude: 'Anthropic Claude',
								openai: 'OpenAI',
								cloudvision: 'Cloud Vision'
							}}
							{@const providerColors = {
								gemini: 'bg-blue-100 text-blue-800',
								groq: 'bg-orange-100 text-orange-800',
								claude: 'bg-purple-100 text-purple-800',
								openai: 'bg-green-100 text-green-800',
								cloudvision: 'bg-cyan-100 text-cyan-800'
							}}
							<tr class="hover:bg-gray-50">
								<td class="py-3 pr-4">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {providerColors[stat.provider] || 'bg-gray-100 text-gray-800'}">
										{providerNames[stat.provider] || stat.provider}
									</span>
								</td>
								<td class="py-3 px-4 text-right text-sm text-gray-900">
									{stat.totalEvaluations}
									<span class="text-gray-400 text-xs">
										({stat.successful}/{stat.failed})
									</span>
								</td>
								<td class="py-3 px-4 text-right text-sm">
									<span class="font-medium {stat.successRate >= 90 ? 'text-green-600' : stat.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}">
										{stat.successRate.toFixed(1)}%
									</span>
								</td>
								<td class="py-3 px-4 text-right text-sm">
									<span class="font-medium {stat.consensusAccuracy >= 80 ? 'text-green-600' : stat.consensusAccuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}">
										{stat.consensusAccuracy.toFixed(1)}%
									</span>
								</td>
								<td class="py-3 pl-4 text-right text-sm text-gray-900">
									{(stat.avgDurationMs / 1000).toFixed(2)}s
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Loading state -->
		<div class="flex items-center justify-center py-12">
			<div class="flex flex-col items-center gap-4">
				<div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
				<p class="text-gray-600">Loading dashboard data...</p>
			</div>
		</div>
	{/if}
</div>
