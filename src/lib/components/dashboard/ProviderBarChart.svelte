<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

	interface ProviderStat {
		provider: string;
		successRate: number;
		consensusAccuracy: number;
		avgDurationMs: number;
	}

	interface Props {
		providerStats: ProviderStat[];
	}

	let { providerStats }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const providerColors: Record<string, { bg: string; border: string }> = {
		gemini: { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },
		groq: { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgb(249, 115, 22)' },
		claude: { bg: 'rgba(147, 51, 234, 0.7)', border: 'rgb(147, 51, 234)' },
		openai: { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },
		cloudvision: { bg: 'rgba(6, 182, 212, 0.7)', border: 'rgb(6, 182, 212)' }
	};

	const providerNames: Record<string, string> = {
		gemini: 'Gemini',
		groq: 'Groq',
		claude: 'Claude',
		openai: 'OpenAI',
		cloudvision: 'Cloud Vision'
	};

	function createChart() {
		if (!canvas) return;

		const labels = providerStats.map((p) => providerNames[p.provider] || p.provider);
		const successData = providerStats.map((p) => p.successRate);
		const accuracyData = providerStats.map((p) => p.consensusAccuracy);
		const bgColors = providerStats.map((p) => providerColors[p.provider]?.bg || 'rgba(107, 114, 128, 0.7)');
		const borderColors = providerStats.map((p) => providerColors[p.provider]?.border || 'rgb(107, 114, 128)');

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: 'Success Rate (%)',
						data: successData,
						backgroundColor: bgColors,
						borderColor: borderColors,
						borderWidth: 1
					},
					{
						label: 'Consensus Accuracy (%)',
						data: accuracyData,
						backgroundColor: bgColors.map((c) => c.replace('0.7', '0.4')),
						borderColor: borderColors,
						borderWidth: 1,
						borderDash: [5, 5]
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top'
					},
					tooltip: {
						callbacks: {
							label: (context) => `${context.dataset.label}: ${context.raw}%`
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						max: 100,
						ticks: {
							callback: (value) => `${value}%`
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
		if (providerStats && canvas) {
			createChart();
		}
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
	<h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">Provider Performance</h3>
	<div class="h-64 sm:h-72">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
