<script lang="ts">
	let files: FileList | null = $state(null);
	let isDragging = $state(false);
	let imagePreview: string | null = $state(null);
	let isUploading = $state(false);
	let error: string | null = $state(null);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			handleFileSelect(droppedFiles);
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFileSelect(target.files);
		}
	}

	function handleFileSelect(selectedFiles: FileList) {
		const file = selectedFiles[0];

		// Validate file type
		if (!file.type.startsWith('image/')) {
			error = 'Please select an image file (JPEG, PNG, WebP)';
			return;
		}

		// Validate file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			error = 'Image size must be less than 10MB';
			return;
		}

		error = null;
		files = selectedFiles;

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			imagePreview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function clearSelection() {
		files = null;
		imagePreview = null;
		error = null;
	}

	async function handleSubmit() {
		if (!files || files.length === 0) {
			error = 'Please select an image first';
			return;
		}

		isUploading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('image', files[0]);

			const response = await fetch('/api/evaluate', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to submit evaluation');
			}

			const result = await response.json();

			// Redirect to evaluation page
			window.location.href = `/evaluation/${result.evaluation.id}`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Evaluate | Multi-AI Label Evaluator</title>
</svelte:head>

<div class="space-y-6 sm:space-y-8">
	<!-- Hero Section -->
	<div class="text-center">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Product Label Analyzer</h1>
		<p class="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
			Upload a pharmaceutical or supplement product label to extract and analyze its contents using
			5 AI services simultaneously.
		</p>
	</div>

	<!-- Upload Section -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
		<h2 class="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
			Upload Product Label
		</h2>

		{#if !imagePreview}
			<!-- Drop Zone - Mobile optimized -->
			<div
				class="border-2 border-dashed rounded-lg p-6 sm:p-8 md:p-12 text-center transition-colors {isDragging
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 hover:border-gray-400 active:border-blue-400'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				role="button"
				tabindex="0"
				style="touch-action: manipulation;"
			>
				<svg
					class="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p class="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
					<span class="hidden sm:inline">Drag and drop your product label image here</span>
					<span class="sm:hidden">Tap to upload product label</span>
				</p>
				<p class="mt-1.5 sm:mt-2 text-sm text-gray-500">or</p>
				<label class="mt-3 sm:mt-4 inline-block">
					<span
						class="px-5 sm:px-6 py-2.5 sm:py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors inline-block"
						style="touch-action: manipulation;"
					>
						Browse Files
					</span>
					<input
						type="file"
						accept="image/*"
						capture="environment"
						class="hidden"
						onchange={handleFileInput}
					/>
				</label>
				<p class="mt-3 sm:mt-4 text-xs text-gray-400">
					Supported formats: JPEG, PNG, WebP (Max 10MB)
				</p>
			</div>
		{:else}
			<!-- Preview -->
			<div class="space-y-4">
				<div class="relative">
					<img
						src={imagePreview}
						alt="Product label preview"
						class="max-h-64 sm:max-h-80 md:max-h-96 mx-auto rounded-lg shadow-md"
					/>
					<button
						type="button"
						onclick={clearSelection}
						class="absolute top-2 right-2 p-2 sm:p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 active:bg-red-700 transition-colors"
						style="touch-action: manipulation;"
						aria-label="Remove image"
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

				{#if files && files[0]}
					<p class="text-center text-sm text-gray-500">
						{files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
					</p>
				{/if}

				<div class="flex justify-center">
					<button
						type="button"
						onclick={handleSubmit}
						disabled={isUploading}
						class="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
						style="touch-action: manipulation;"
					>
						{#if isUploading}
							<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
							<span>Analyzing...</span>
						{:else}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
							<span>Analyze with 5 AI Services</span>
						{/if}
					</button>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-sm text-red-600">{error}</p>
			</div>
		{/if}
	</div>

	<!-- AI Providers Info -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
		<h2 class="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">AI Services</h2>
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
			<div class="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
				<div class="text-xl sm:text-2xl mb-1.5 sm:mb-2">🔷</div>
				<p class="font-medium text-sm sm:text-base text-gray-900">Gemini</p>
				<p class="text-xs text-gray-500">Google AI</p>
			</div>
			<div class="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
				<div class="text-xl sm:text-2xl mb-1.5 sm:mb-2">⚡</div>
				<p class="font-medium text-sm sm:text-base text-gray-900">Groq</p>
				<p class="text-xs text-gray-500">Llama 4</p>
			</div>
			<div class="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
				<div class="text-xl sm:text-2xl mb-1.5 sm:mb-2">🟤</div>
				<p class="font-medium text-sm sm:text-base text-gray-900">Claude</p>
				<p class="text-xs text-gray-500">Anthropic</p>
			</div>
			<div class="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
				<div class="text-xl sm:text-2xl mb-1.5 sm:mb-2">🟢</div>
				<p class="font-medium text-sm sm:text-base text-gray-900">OpenAI</p>
				<p class="text-xs text-gray-500">GPT-4o</p>
			</div>
			<div class="text-center p-3 sm:p-4 bg-gray-50 rounded-lg col-span-2 sm:col-span-1">
				<div class="text-xl sm:text-2xl mb-1.5 sm:mb-2">👁️</div>
				<p class="font-medium text-sm sm:text-base text-gray-900">Cloud Vision</p>
				<p class="text-xs text-gray-500">Google OCR</p>
			</div>
		</div>
	</div>

	<!-- Features -->
	<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
			<div class="text-blue-600 mb-2 sm:mb-3">
				<svg class="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<h3 class="text-base sm:text-lg font-semibold text-gray-900">Parallel Processing</h3>
			<p class="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
				All 5 AI services analyze your image simultaneously for faster results.
			</p>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
			<div class="text-blue-600 mb-2 sm:mb-3">
				<svg class="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h3 class="text-base sm:text-lg font-semibold text-gray-900">Drug Facts Extraction</h3>
			<p class="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
				Extract active ingredients, dosages, warnings, and formulation details.
			</p>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
			<div class="text-blue-600 mb-2 sm:mb-3">
				<svg class="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h3 class="text-base sm:text-lg font-semibold text-gray-900">Performance Metrics</h3>
			<p class="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
				Track response times and compare accuracy across AI providers.
			</p>
		</div>
	</div>
</div>
