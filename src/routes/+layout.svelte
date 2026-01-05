<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import type { RecordModel } from 'pocketbase';

	interface Props {
		data: { user: RecordModel | null };
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
</script>

<svelte:head>
	<title>Multi-AI Label Evaluator</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Navigation Header -->
	<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-14 sm:h-16">
				<!-- Logo -->
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-2">
						<svg
							class="h-6 w-6 sm:h-8 sm:w-8 text-blue-600"
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
						<span class="text-base sm:text-xl font-bold text-gray-900 hidden xs:inline">
							Multi-AI Label Evaluator
						</span>
						<span class="text-base font-bold text-gray-900 xs:hidden"> Label Evaluator </span>
					</a>
				</div>

				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-4">
					{#if data.user}
						<a
							href="/"
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors {page
								.url.pathname === '/'
								? 'text-blue-600 bg-blue-50'
								: ''}"
						>
							Evaluate
						</a>
						<a
							href="/history"
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors {page
								.url.pathname === '/history'
								? 'text-blue-600 bg-blue-50'
								: ''}"
						>
							History
						</a>
						<a
							href="/settings"
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors {page
								.url.pathname === '/settings'
								? 'text-blue-600 bg-blue-50'
								: ''}"
						>
							Settings
						</a>

						<div class="flex items-center space-x-3 pl-3 border-l border-gray-200">
							<div class="flex items-center">
								<div
									class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium"
								>
									{data.user.email?.charAt(0).toUpperCase() || 'U'}
								</div>
								<span class="ml-2 text-sm text-gray-600 max-w-[150px] truncate">
									{data.user.email}
								</span>
							</div>
							<form action="/login?/logout" method="POST">
								<button
									type="submit"
									class="text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
								>
									Sign Out
								</button>
							</form>
						</div>
					{:else}
						<a
							href="/login"
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
						>
							Sign In
						</a>
					{/if}
				</div>

				<!-- Mobile Navigation -->
				{#if data.user}
					<div class="flex items-center md:hidden">
						<MobileNav user={data.user} />
					</div>
				{:else}
					<div class="flex items-center md:hidden">
						<a
							href="/login"
							class="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
						>
							Sign In
						</a>
					</div>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
		{@render children()}
	</main>

	<!-- Footer - hidden on very small screens -->
	<footer class="bg-white border-t border-gray-200 hidden sm:block">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<p class="text-center text-sm text-gray-500">
				Multi-AI Product Label Evaluator - Pharmaceutical & Supplement Analysis
			</p>
		</div>
	</footer>
</div>
