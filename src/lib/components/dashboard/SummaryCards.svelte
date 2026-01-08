<script lang="ts">
	interface Props {
		totalEvaluations: number;
		completedEvaluations: number;
		averageProcessingTimeMs: number;
		overallConsensusRate: number;
	}

	let { totalEvaluations, completedEvaluations, averageProcessingTimeMs, overallConsensusRate }: Props = $props();

	const successRate = $derived(
		totalEvaluations > 0 ? ((completedEvaluations / totalEvaluations) * 100).toFixed(1) : '0'
	);

	const avgTimeSeconds = $derived((averageProcessingTimeMs / 1000).toFixed(1));
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
	<!-- Total Evaluations -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
		<div class="flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg">
				<svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</div>
			<div>
				<p class="text-xs sm:text-sm text-gray-500">Total Evaluations</p>
				<p class="text-xl sm:text-2xl font-bold text-gray-900">{totalEvaluations}</p>
			</div>
		</div>
	</div>

	<!-- Success Rate -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
		<div class="flex items-center gap-3">
			<div class="p-2 bg-green-100 rounded-lg">
				<svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div>
				<p class="text-xs sm:text-sm text-gray-500">Success Rate</p>
				<p class="text-xl sm:text-2xl font-bold text-gray-900">{successRate}%</p>
			</div>
		</div>
	</div>

	<!-- Consensus Rate -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
		<div class="flex items-center gap-3">
			<div class="p-2 bg-purple-100 rounded-lg">
				<svg class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<div>
				<p class="text-xs sm:text-sm text-gray-500">Consensus Rate</p>
				<p class="text-xl sm:text-2xl font-bold text-gray-900">{overallConsensusRate.toFixed(1)}%</p>
			</div>
		</div>
	</div>

	<!-- Average Time -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
		<div class="flex items-center gap-3">
			<div class="p-2 bg-orange-100 rounded-lg">
				<svg class="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div>
				<p class="text-xs sm:text-sm text-gray-500">Avg Response</p>
				<p class="text-xl sm:text-2xl font-bold text-gray-900">{avgTimeSeconds}s</p>
			</div>
		</div>
	</div>
</div>
