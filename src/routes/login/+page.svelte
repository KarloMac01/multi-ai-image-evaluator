<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		form: { error?: string; email?: string } | null;
	}

	let { form }: Props = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Sign In | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-6 sm:mb-8">
			<div class="flex justify-center mb-4">
				<svg
					class="h-12 w-12 sm:h-16 sm:w-16 text-blue-600"
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
			</div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
			<p class="mt-2 text-sm sm:text-base text-gray-600">Sign in to analyze product labels</p>
		</div>

		<!-- Form Card -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
			{#if form?.error}
				<div class="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-sm text-red-600">{form.error}</p>
				</div>
			{/if}

			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
				class="space-y-4 sm:space-y-5"
			>
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-1.5"> Email </label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email ?? ''}
						required
						autocomplete="email"
						class="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base outline-none transition-shadow"
						placeholder="you@example.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						autocomplete="current-password"
						class="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base outline-none transition-shadow"
						placeholder="Enter your password"
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full py-3 sm:py-3.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-base"
					style="touch-action: manipulation;"
				>
					{#if isSubmitting}
						<span class="flex items-center justify-center">
							<svg
								class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Signing in...
						</span>
					{:else}
						Sign In
					{/if}
				</button>
			</form>
		</div>

	</div>
</div>
