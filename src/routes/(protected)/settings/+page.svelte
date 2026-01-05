<script lang="ts">
	import { untrack } from 'svelte';
	import type { AIProvider, PromptType, Prompt } from '$lib/pocketbase/types';

	// State
	let isLoading = $state(true);
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Prompts data
	let prompts = $state<Prompt[]>([]);
	let activePrompts = $state<Record<AIProvider, { extraction?: Prompt; formulation?: Prompt }>>({
		gemini: {},
		groq: {},
		claude: {},
		openai: {},
		cloudvision: {}
	});
	let defaultExtractionPrompt = $state('');
	let defaultFormulationPrompt = $state('');

	// UI State
	let selectedProvider = $state<AIProvider>('gemini');
	let selectedPromptType = $state<PromptType>('extraction');
	let isEditing = $state(false);
	let editingPrompt = $state<Prompt | null>(null);

	// Form state for new/edit prompt
	let formName = $state('');
	let formContent = $state('');
	let formDescription = $state('');
	let formIsActive = $state(false);

	// Available providers
	const providers: { id: AIProvider; name: string }[] = [
		{ id: 'gemini', name: 'Google Gemini' },
		{ id: 'groq', name: 'Groq' },
		{ id: 'claude', name: 'Anthropic Claude' },
		{ id: 'openai', name: 'OpenAI' },
		{ id: 'cloudvision', name: 'Cloud Vision' }
	];

	// Filtered prompts for current selection
	let filteredPrompts = $derived(
		prompts.filter((p) => p.provider === selectedProvider && p.prompt_type === selectedPromptType)
	);

	// Current active prompt for selection
	let currentActivePrompt = $derived(activePrompts[selectedProvider]?.[selectedPromptType]);

	async function loadPrompts() {
		try {
			isLoading = true;
			errorMessage = null;

			const response = await fetch('/api/prompts');
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to load prompts');
			}

			prompts = data.prompts || [];
			activePrompts = data.activePrompts || {
				gemini: {},
				groq: {},
				claude: {},
				openai: {},
				cloudvision: {}
			};
			defaultExtractionPrompt = data.defaults?.extraction || '';
			defaultFormulationPrompt = data.defaults?.formulation || '';
		} catch (err) {
			console.error('Failed to load prompts:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
		} finally {
			isLoading = false;
		}
	}

	function startNewPrompt() {
		editingPrompt = null;
		formName = '';
		formContent =
			selectedPromptType === 'extraction' ? defaultExtractionPrompt : defaultFormulationPrompt;
		formDescription = '';
		formIsActive = filteredPrompts.length === 0; // Auto-activate if first prompt
		isEditing = true;
	}

	function startEditPrompt(prompt: Prompt) {
		editingPrompt = prompt;
		formName = prompt.name;
		formContent = prompt.content;
		formDescription = prompt.description || '';
		formIsActive = prompt.is_active;
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
		editingPrompt = null;
	}

	async function savePrompt() {
		if (!formName.trim()) {
			errorMessage = 'Prompt name is required';
			return;
		}
		if (!formContent.trim()) {
			errorMessage = 'Prompt content is required';
			return;
		}

		try {
			isSaving = true;
			errorMessage = null;

			if (editingPrompt) {
				// Update existing prompt
				const response = await fetch(`/api/prompts/${editingPrompt.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formName,
						content: formContent,
						description: formDescription,
						is_active: formIsActive
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.message || 'Failed to update prompt');
				}

				successMessage = 'Prompt updated successfully';
			} else {
				// Create new prompt
				const response = await fetch('/api/prompts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formName,
						provider: selectedProvider,
						prompt_type: selectedPromptType,
						content: formContent,
						description: formDescription,
						is_active: formIsActive
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.message || 'Failed to create prompt');
				}

				successMessage = 'Prompt created successfully';
			}

			// Reload prompts and close editor
			await loadPrompts();
			isEditing = false;
			editingPrompt = null;

			setTimeout(() => (successMessage = null), 3000);
		} catch (err) {
			console.error('Failed to save prompt:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to save prompt';
		} finally {
			isSaving = false;
		}
	}

	async function deletePrompt(prompt: Prompt) {
		if (!confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
			return;
		}

		try {
			isSaving = true;
			errorMessage = null;

			const response = await fetch(`/api/prompts/${prompt.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to delete prompt');
			}

			successMessage = 'Prompt deleted';
			await loadPrompts();

			setTimeout(() => (successMessage = null), 3000);
		} catch (err) {
			console.error('Failed to delete prompt:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to delete prompt';
		} finally {
			isSaving = false;
		}
	}

	async function setActivePrompt(prompt: Prompt) {
		try {
			isSaving = true;
			errorMessage = null;

			const response = await fetch(`/api/prompts/${prompt.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: true })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to set active prompt');
			}

			successMessage = `"${prompt.name}" is now active for ${selectedProvider}`;
			await loadPrompts();

			setTimeout(() => (successMessage = null), 3000);
		} catch (err) {
			console.error('Failed to set active prompt:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to set active prompt';
		} finally {
			isSaving = false;
		}
	}

	let isSeeding = $state(false);

	async function seedDefaultPrompts() {
		if (!confirm('This will create default prompts for all providers that don\'t have prompts yet. Continue?')) {
			return;
		}

		try {
			isSeeding = true;
			errorMessage = null;

			const response = await fetch('/api/prompts/seed', {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to seed prompts');
			}

			successMessage = `Created ${data.created.length} prompts, skipped ${data.skipped.length} existing`;
			await loadPrompts();

			setTimeout(() => (successMessage = null), 5000);
		} catch (err) {
			console.error('Failed to seed prompts:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to seed prompts';
		} finally {
			isSeeding = false;
		}
	}

	$effect(() => {
		untrack(() => loadPrompts());
	});
</script>

<svelte:head>
	<title>Prompt Settings | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Prompt Settings</h1>
			<p class="mt-1 text-sm sm:text-base text-gray-600">
				Manage AI prompts for each provider. Create multiple prompts and select which one to use.
			</p>
		</div>
		<button
			onclick={seedDefaultPrompts}
			disabled={isSeeding || isLoading}
			class="self-start px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
			style="touch-action: manipulation;"
		>
			{#if isSeeding}
				<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Seeding...
			{:else}
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Seed Default Prompts
			{/if}
		</button>
	</div>

	<!-- Messages -->
	{#if errorMessage}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
			{errorMessage}
		</div>
	{/if}

	{#if successMessage}
		<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
			{successMessage}
		</div>
	{/if}

	{#if isLoading}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<div
				class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
			></div>
			<p class="mt-4 text-gray-600">Loading prompts...</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<!-- Provider and Type Selector -->
			<div class="p-4 border-b border-gray-200 space-y-4">
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Provider selector -->
					<div class="flex-1">
						<label for="provider" class="block text-sm font-medium text-gray-700 mb-1">
							AI Provider
						</label>
						<select
							id="provider"
							bind:value={selectedProvider}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{#each providers as provider (provider.id)}
								<option value={provider.id}>{provider.name}</option>
							{/each}
						</select>
					</div>

					<!-- Prompt type selector -->
					<div class="flex-1">
						<label for="promptType" class="block text-sm font-medium text-gray-700 mb-1">
							Prompt Type
						</label>
						<select
							id="promptType"
							bind:value={selectedPromptType}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="extraction">Extraction Prompt</option>
							<option value="formulation">Formulation Prompt</option>
						</select>
					</div>
				</div>

				<!-- Current active indicator -->
				<div class="flex items-center justify-between">
					<div class="text-sm">
						{#if currentActivePrompt}
							<span class="text-gray-600">Active: </span>
							<span class="font-medium text-green-700">{currentActivePrompt.name}</span>
						{:else}
							<span class="text-amber-600">No active prompt - using default</span>
						{/if}
					</div>
					<button
						onclick={startNewPrompt}
						disabled={isEditing}
						class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
						style="touch-action: manipulation;"
					>
						+ New Prompt
					</button>
				</div>
			</div>

			<!-- Prompt Editor -->
			{#if isEditing}
				<div class="p-4 border-b border-gray-200 bg-blue-50">
					<h3 class="font-semibold text-gray-900 mb-4">
						{editingPrompt ? 'Edit Prompt' : 'New Prompt'}
					</h3>

					<div class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label for="promptName" class="block text-sm font-medium text-gray-700 mb-1">
									Name *
								</label>
								<input
									id="promptName"
									type="text"
									bind:value={formName}
									placeholder="e.g., Detailed Extraction v2"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<div>
								<label for="promptDesc" class="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<input
									id="promptDesc"
									type="text"
									bind:value={formDescription}
									placeholder="Brief description of this prompt"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</div>

						<div>
							<label for="promptContent" class="block text-sm font-medium text-gray-700 mb-1">
								Prompt Content *
							</label>
							<textarea
								id="promptContent"
								bind:value={formContent}
								rows={15}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
								placeholder="Enter the prompt text..."
							></textarea>
							<p class="mt-1 text-xs text-gray-500">
								Characters: {formContent.length} | Lines: {formContent.split('\n').length}
							</p>
						</div>

						<div class="flex items-center">
							<input
								id="isActive"
								type="checkbox"
								bind:checked={formIsActive}
								class="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
							/>
							<label for="isActive" class="ml-2 text-sm text-gray-700">
								Set as active prompt for {providers.find((p) => p.id === selectedProvider)?.name}
							</label>
						</div>

						<div class="flex gap-2 justify-end">
							<button
								onclick={cancelEdit}
								disabled={isSaving}
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
								style="touch-action: manipulation;"
							>
								Cancel
							</button>
							<button
								onclick={savePrompt}
								disabled={isSaving}
								class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
								style="touch-action: manipulation;"
							>
								{isSaving ? 'Saving...' : editingPrompt ? 'Update Prompt' : 'Create Prompt'}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Prompts List -->
			<div class="p-4">
				{#if filteredPrompts.length === 0}
					<div class="text-center py-8 text-gray-500">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
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
						<p class="mt-2">No prompts yet for {providers.find((p) => p.id === selectedProvider)?.name}</p>
						<p class="text-sm">The default prompt will be used.</p>
						<button
							onclick={startNewPrompt}
							class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
							style="touch-action: manipulation;"
						>
							Create your first prompt
						</button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each filteredPrompts as prompt (prompt.id)}
							<div
								class="border rounded-lg p-4 {prompt.is_active
									? 'border-green-500 bg-green-50'
									: 'border-gray-200 hover:border-gray-300'}"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<h4 class="font-medium text-gray-900">{prompt.name}</h4>
											{#if prompt.is_active}
												<span
													class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full"
												>
													Active
												</span>
											{/if}
										</div>
										{#if prompt.description}
											<p class="mt-1 text-sm text-gray-600">{prompt.description}</p>
										{/if}
										<p class="mt-1 text-xs text-gray-500">
											{prompt.content.length} chars | Updated {new Date(prompt.updated).toLocaleDateString()}
										</p>
									</div>

									<div class="flex items-center gap-2">
										{#if !prompt.is_active}
											<button
												onclick={() => setActivePrompt(prompt)}
												disabled={isSaving}
												class="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
												style="touch-action: manipulation;"
											>
												Set Active
											</button>
										{/if}
										<button
											onclick={() => startEditPrompt(prompt)}
											disabled={isEditing || isSaving}
											class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
											style="touch-action: manipulation;"
										>
											Edit
										</button>
										<button
											onclick={() => deletePrompt(prompt)}
											disabled={isSaving}
											class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
											style="touch-action: manipulation;"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Help Section -->
		<div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
			<h3 class="font-medium text-gray-900 mb-2">How Prompts Work</h3>
			<ul class="text-sm text-gray-600 space-y-1">
				<li>
					<strong>Active Prompt:</strong> The prompt marked as "Active" will be used when that AI provider
					processes an image.
				</li>
				<li>
					<strong>Default Fallback:</strong> If no active prompt is set for a provider, the built-in
					default prompt is used.
				</li>
				<li>
					<strong>Per-Provider:</strong> Each AI provider can have its own customized prompt for better
					results.
				</li>
				<li>
					<strong>Prompt Types:</strong> "Extraction" prompts read label data, "Formulation" prompts
					analyze the pharmaceutical composition.
				</li>
			</ul>
		</div>
	{/if}
</div>
