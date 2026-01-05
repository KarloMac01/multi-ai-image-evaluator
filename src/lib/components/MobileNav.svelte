<script lang="ts">
	import { page } from '$app/state';
	import type { RecordModel } from 'pocketbase';

	interface Props {
		user: RecordModel | null;
	}

	let { user }: Props = $props();
	let isOpen = $state(false);

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	// Close menu on navigation
	$effect(() => {
		// Track pathname changes
		page.url.pathname;
		isOpen = false;
	});

	// Prevent body scroll when menu is open
	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<!-- Hamburger Button - visible on mobile only -->
<button
	type="button"
	class="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-gray-200 transition-colors"
	onclick={toggleMenu}
	aria-expanded={isOpen}
	aria-label="Toggle navigation menu"
	style="touch-action: manipulation;"
>
	{#if isOpen}
		<!-- X icon -->
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	{:else}
		<!-- Hamburger icon -->
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	{/if}
</button>

<!-- Mobile menu overlay -->
{#if isOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50 md:hidden"
		onclick={closeMenu}
		aria-label="Close menu"
		style="touch-action: manipulation;"
	></button>
{/if}

<!-- Mobile slide-out menu -->
<div
	class="fixed top-0 right-0 z-50 h-full w-72 max-w-[80vw] bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden {isOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-gray-200">
			<span class="font-semibold text-gray-900">Menu</span>
			<button
				type="button"
				class="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
				onclick={closeMenu}
				aria-label="Close menu"
				style="touch-action: manipulation;"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Navigation Links -->
		<nav class="flex-1 p-4 space-y-2 overflow-y-auto">
			<a
				href="/"
				class="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors {page
					.url.pathname === '/'
					? 'bg-blue-50 text-blue-700 font-medium'
					: ''}"
				style="touch-action: manipulation;"
			>
				<svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Evaluate
			</a>
			<a
				href="/history"
				class="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors {page
					.url.pathname === '/history'
					? 'bg-blue-50 text-blue-700 font-medium'
					: ''}"
				style="touch-action: manipulation;"
			>
				<svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				History
			</a>
			<a
				href="/settings"
				class="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors {page
					.url.pathname === '/settings'
					? 'bg-blue-50 text-blue-700 font-medium'
					: ''}"
				style="touch-action: manipulation;"
			>
				<svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				Settings
			</a>
		</nav>

		<!-- User section -->
		{#if user}
			<div class="p-4 border-t border-gray-200 bg-gray-50">
				<div class="flex items-center mb-3">
					<div
						class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium"
					>
						{user.email?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="ml-3 overflow-hidden">
						<p class="text-sm font-medium text-gray-900 truncate">{user.email}</p>
						<p class="text-xs text-gray-500">Signed in</p>
					</div>
				</div>
				<form action="/login?/logout" method="POST">
					<button
						type="submit"
						class="w-full flex items-center justify-center px-4 py-2.5 text-red-600 bg-white border border-red-200 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors"
						style="touch-action: manipulation;"
					>
						<svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
						Sign Out
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
