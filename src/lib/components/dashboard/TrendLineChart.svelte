<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

	interface TrendData {
		date: string;
		evaluationCount: number;
		successRate: number;
		avgDurationMs: number;
	}

	interface Props {
		trends: TrendData[];
	}

	let { trends }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function createChart() {
		if (!canvas || trends.length === 0) return;

		const labels = trends.map((t) => formatDate(t.date));
		const successRates = trends.map((t) => t.successRate);
		const evalCounts = trends.map((t) => t.evaluationCount);

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Success Rate (%)',
						data: successRates,
						borderColor: 'rgb(34, 197, 94)',
						backgroundColor: 'rgba(34, 197, 94, 0.1)',
						fill: true,
						tension: 0.3,
						yAxisID: 'y'
					},
					{
						label: 'Evaluations',
						data: evalCounts,
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: false,
						tension: 0.3,
						yAxisID: 'y1',
						borderDash: [5, 5]
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						position: 'top'
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								if (context.dataset.label === 'Success Rate (%)') {
									return `${context.dataset.label}: ${context.raw}%`;
								}
								return `${context.dataset.label}: ${context.raw}`;
							}
						}
					}
				},
				scales: {
					y: {
						type: 'linear',
						position: 'left',
						beginAtZero: true,
						max: 100,
						ticks: {
							callback: (value) => `${value}%`
						},
						title: {
							display: true,
							text: 'Success Rate'
						}
					},
					y1: {
						type: 'linear',
						position: 'right',
						beginAtZero: true,
						grid: {
							drawOnChartArea: false
						},
						title: {
							display: true,
							text: 'Evaluations'
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
		if (trends && canvas) {
			createChart();
		}
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
	<h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>

	{#if trends.length === 0}
		<div class="h-64 flex items-center justify-center text-gray-500">
			<p>No trend data available</p>
		</div>
	{:else}
		<div class="h-64 sm:h-72">
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
