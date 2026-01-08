<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

	Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

	interface Props {
		distribution: {
			full: number;
			strong: number;
			majority: number;
			split: number;
		};
	}

	let { distribution }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const total = $derived(distribution.full + distribution.strong + distribution.majority + distribution.split);
	const consensusRate = $derived(
		total > 0
			? (((distribution.full + distribution.strong + distribution.majority) / total) * 100).toFixed(1)
			: '0'
	);

	function createChart() {
		if (!canvas) return;

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: ['Full (5/5)', 'Strong (4/5)', 'Majority (3/5)', 'Split (<3/5)'],
				datasets: [
					{
						data: [distribution.full, distribution.strong, distribution.majority, distribution.split],
						backgroundColor: [
							'rgba(34, 197, 94, 0.8)',   // green
							'rgba(132, 204, 22, 0.8)',  // lime
							'rgba(234, 179, 8, 0.8)',   // yellow
							'rgba(239, 68, 68, 0.8)'    // red
						],
						borderColor: [
							'rgb(34, 197, 94)',
							'rgb(132, 204, 22)',
							'rgb(234, 179, 8)',
							'rgb(239, 68, 68)'
						],
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '60%',
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							padding: 15,
							usePointStyle: true,
							font: {
								size: 11
							}
						}
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const value = context.raw as number;
								const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
								return `${context.label}: ${value} (${percentage}%)`;
							}
						}
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		if (distribution && canvas) {
			createChart();
		}
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
	<h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">Consensus Distribution</h3>

	<div class="relative">
		<div class="h-56 sm:h-64">
			<canvas bind:this={canvas}></canvas>
		</div>
		<!-- Center label -->
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="margin-bottom: 40px;">
			<div class="text-center">
				<p class="text-2xl sm:text-3xl font-bold text-gray-900">{consensusRate}%</p>
				<p class="text-xs text-gray-500">Consensus</p>
			</div>
		</div>
	</div>

	<!-- Summary stats -->
	<div class="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
		<div>
			<p class="font-semibold text-green-600">{distribution.full}</p>
			<p class="text-gray-500">Full</p>
		</div>
		<div>
			<p class="font-semibold text-lime-600">{distribution.strong}</p>
			<p class="text-gray-500">Strong</p>
		</div>
		<div>
			<p class="font-semibold text-yellow-600">{distribution.majority}</p>
			<p class="text-gray-500">Majority</p>
		</div>
		<div>
			<p class="font-semibold text-red-600">{distribution.split}</p>
			<p class="text-gray-500">Split</p>
		</div>
	</div>
</div>
