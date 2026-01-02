<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Multi-AI Label Evaluator</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Navigation Header -->
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-2">
						<svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span class="text-xl font-bold text-gray-900">Multi-AI Label Evaluator</span>
					</a>
				</div>
				<div class="flex items-center space-x-4">
					<a
						href="/"
						class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
					>
						Evaluate
					</a>
					<a
						href="/history"
						class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
					>
						History
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-white border-t border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<p class="text-center text-sm text-gray-500">
				Multi-AI Product Label Evaluator - Pharmaceutical & Supplement Analysis
			</p>
		</div>
	</footer>
</div>
