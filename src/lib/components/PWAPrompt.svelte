<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let needRefresh = $state(false);
	let offlineReady = $state(false);
	let updateSW: ((reload?: boolean) => Promise<void>) | undefined;

	onMount(async () => {
		if (!browser) return;

		try {
			const { useRegisterSW } = await import('virtual:pwa-register');

			const { needRefresh: nr, offlineReady: or, updateServiceWorker } = useRegisterSW({
				immediate: true,
				onRegisteredSW(swUrl, r) {
					console.log('SW registered:', swUrl);
					// Check for updates every hour
					if (r) {
						setInterval(() => {
							r.update();
						}, 60 * 60 * 1000);
					}
				},
				onRegisterError(error) {
					console.error('SW registration error:', error);
				}
			});

			// Subscribe to reactive values
			$effect(() => {
				needRefresh = nr.value;
			});

			$effect(() => {
				offlineReady = or.value;
			});

			updateSW = updateServiceWorker;
		} catch (e) {
			console.log('PWA not available:', e);
		}
	});

	function close() {
		offlineReady = false;
		needRefresh = false;
	}

	async function handleUpdate() {
		if (updateSW) {
			await updateSW(true);
		}
	}
</script>

{#if offlineReady || needRefresh}
	<div
		class="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4"
		role="alert"
	>
		<div class="flex items-start gap-3">
			<div class="flex-shrink-0">
				{#if needRefresh}
					<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{:else}
					<svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{/if}
			</div>

			<div class="flex-1">
				{#if needRefresh}
					<p class="text-sm font-medium text-gray-900">New version available</p>
					<p class="mt-1 text-sm text-gray-500">Click reload to update the app.</p>
				{:else}
					<p class="text-sm font-medium text-gray-900">App ready for offline use</p>
					<p class="mt-1 text-sm text-gray-500">Content has been cached for offline access.</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={close}
				class="flex-shrink-0 text-gray-400 hover:text-gray-600"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		{#if needRefresh}
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={handleUpdate}
					class="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					Reload
				</button>
				<button
					type="button"
					onclick={close}
					class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
				>
					Later
				</button>
			</div>
		{/if}
	</div>
{/if}
