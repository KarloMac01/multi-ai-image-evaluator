<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let Cropper: typeof import('cropperjs').default;

	interface Props {
		imageUrl: string;
		onConfirm: (blob: Blob) => void;
		onCancel: () => void;
	}

	let { imageUrl, onConfirm, onCancel }: Props = $props();

	let imageElement: HTMLImageElement;
	let cropper: Cropper | null = null;
	let activeTab: 'crop' | 'enhance' = $state('crop');
	let isProcessing = $state(false);

	// Enhancement settings
	let brightness = $state(100);
	let contrast = $state(100);
	let sharpness = $state(0);

	// Track if any enhancements were applied
	let hasEnhancements = $derived(brightness !== 100 || contrast !== 100 || sharpness > 0);

	// Track if cropper has been modified (rotation, flip, crop area changed)
	let cropperModified = $state(false);

	// Track if any changes were made
	let hasAnyChanges = $derived(hasEnhancements || cropperModified);

	onMount(async () => {
		if (browser) {
			// Dynamically import Cropper in browser only
			const cropperModule = await import('cropperjs');
			Cropper = cropperModule.default;

			if (imageElement) {
				initCropper();
			}
		}
	});

	onDestroy(() => {
		if (cropper) {
			cropper.destroy();
			cropper = null;
		}
	});

	function initCropper() {
		if (!Cropper || !imageElement) return;

		if (cropper) {
			cropper.destroy();
		}

		cropper = new Cropper(imageElement, {
			aspectRatio: NaN, // Free aspect ratio
			viewMode: 1,
			dragMode: 'move',
			autoCropArea: 1,
			restore: false,
			guides: true,
			center: true,
			highlight: true,
			cropBoxMovable: true,
			cropBoxResizable: true,
			toggleDragModeOnDblclick: true,
			responsive: true,
			checkOrientation: true,
			background: true
		});
	}

	function resetCrop() {
		cropper?.reset();
		cropperModified = false;
	}

	function rotateCW() {
		cropper?.rotate(90);
		cropperModified = true;
	}

	function rotateCCW() {
		cropper?.rotate(-90);
		cropperModified = true;
	}

	function flipH() {
		const scaleX = cropper?.getData().scaleX || 1;
		cropper?.scaleX(-scaleX);
		cropperModified = true;
	}

	function flipV() {
		const scaleY = cropper?.getData().scaleY || 1;
		cropper?.scaleY(-scaleY);
		cropperModified = true;
	}

	function resetEnhancements() {
		brightness = 100;
		contrast = 100;
		sharpness = 0;
	}

	function resetAll() {
		// Reset crop
		cropper?.reset();
		cropperModified = false;
		// Reset enhancements
		brightness = 100;
		contrast = 100;
		sharpness = 0;
	}

	async function handleConfirm() {
		if (!cropper) return;

		isProcessing = true;

		try {
			// Get cropped canvas
			const canvas = cropper.getCroppedCanvas({
				maxWidth: 2048,
				maxHeight: 2048,
				imageSmoothingEnabled: true,
				imageSmoothingQuality: 'high'
			});

			if (!canvas) {
				throw new Error('Failed to crop image');
			}

			// Apply enhancements if any
			let finalCanvas = canvas;
			if (hasEnhancements) {
				finalCanvas = await applyEnhancements(canvas);
			}

			// Convert to blob
			const blob = await new Promise<Blob>((resolve, reject) => {
				finalCanvas.toBlob(
					(b) => {
						if (b) resolve(b);
						else reject(new Error('Failed to create blob'));
					},
					'image/jpeg',
					0.92
				);
			});

			onConfirm(blob);
		} catch (error) {
			console.error('Error processing image:', error);
		} finally {
			isProcessing = false;
		}
	}

	async function applyEnhancements(sourceCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return sourceCanvas;

		canvas.width = sourceCanvas.width;
		canvas.height = sourceCanvas.height;

		// Draw original image
		ctx.drawImage(sourceCanvas, 0, 0);

		// Apply CSS filters via canvas
		// Note: For more advanced sharpening, we'd need server-side processing
		const filterParts = [];

		if (brightness !== 100) {
			filterParts.push(`brightness(${brightness}%)`);
		}

		if (contrast !== 100) {
			filterParts.push(`contrast(${contrast}%)`);
		}

		if (filterParts.length > 0) {
			ctx.filter = filterParts.join(' ');
			ctx.drawImage(sourceCanvas, 0, 0);
			ctx.filter = 'none';
		}

		// Apply sharpening using convolution if needed
		if (sharpness > 0) {
			applySharpening(ctx, canvas.width, canvas.height, sharpness / 100);
		}

		return canvas;
	}

	function applySharpening(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		amount: number
	) {
		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;

		// Simple unsharp mask kernel
		const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

		const tempData = new Uint8ClampedArray(data);

		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				for (let c = 0; c < 3; c++) {
					let sum = 0;
					for (let ky = -1; ky <= 1; ky++) {
						for (let kx = -1; kx <= 1; kx++) {
							const idx = ((y + ky) * width + (x + kx)) * 4 + c;
							sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
						}
					}
					const idx = (y * width + x) * 4 + c;
					data[idx] = Math.min(255, Math.max(0, sum));
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);
	}

	// Preview filter string for the image element
	let previewFilter = $derived.by(() => {
		const parts = [];
		if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
		if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
		return parts.length > 0 ? parts.join(' ') : 'none';
	});
</script>

<div class="fixed inset-0 z-50 bg-black/80 flex flex-col">
	<!-- Header -->
	<div class="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
		<button
			type="button"
			onclick={onCancel}
			class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
			aria-label="Cancel"
		>
			<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
		<h2 class="text-lg font-semibold">Edit Image</h2>
		<button
			type="button"
			onclick={handleConfirm}
			disabled={isProcessing}
			class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg font-medium transition-colors flex items-center gap-2"
		>
			{#if isProcessing}
				<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			{/if}
			Done
		</button>
	</div>

	<!-- Tab Navigation -->
	<div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => (activeTab = 'crop')}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'crop'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700'}"
			>
				<span class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
					</svg>
					Crop
				</span>
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'enhance')}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'enhance'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700'}"
			>
				<span class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
					Enhance
				</span>
			</button>
		</div>
		<!-- Reset All button -->
		{#if hasAnyChanges}
			<button
				type="button"
				onclick={resetAll}
				class="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1.5"
				title="Reset all changes"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Reset All
			</button>
		{/if}
	</div>

	<!-- Image Area -->
	<div class="flex-1 overflow-hidden bg-gray-950 relative">
		<div class="absolute inset-0 flex items-center justify-center p-4">
			<img
				bind:this={imageElement}
				src={imageUrl}
				alt="Edit preview"
				class="max-w-full max-h-full"
				style="filter: {previewFilter};"
				crossorigin="anonymous"
			/>
		</div>
	</div>

	<!-- Controls -->
	<div class="bg-gray-900 text-white px-4 py-4">
		{#if activeTab === 'crop'}
			<!-- Crop Controls -->
			<div class="flex justify-center gap-2 flex-wrap">
				<button
					type="button"
					onclick={rotateCCW}
					class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Rotate counter-clockwise"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
					</svg>
				</button>
				<button
					type="button"
					onclick={rotateCW}
					class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Rotate clockwise"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
					</svg>
				</button>
				<button
					type="button"
					onclick={flipH}
					class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Flip horizontal"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
				</button>
				<button
					type="button"
					onclick={flipV}
					class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Flip vertical"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
					</svg>
				</button>
				<button
					type="button"
					onclick={resetCrop}
					class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Reset crop"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>
			<p class="text-center text-sm text-gray-400 mt-3">
				Drag corners to crop. Pinch to zoom on mobile.
			</p>
		{:else}
			<!-- Enhance Controls -->
			<div class="space-y-4 max-w-md mx-auto">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<label for="brightness">Brightness</label>
						<span class="text-gray-400">{brightness}%</span>
					</div>
					<input
						id="brightness"
						type="range"
						min="50"
						max="150"
						bind:value={brightness}
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
					/>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<label for="contrast">Contrast</label>
						<span class="text-gray-400">{contrast}%</span>
					</div>
					<input
						id="contrast"
						type="range"
						min="50"
						max="150"
						bind:value={contrast}
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
					/>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<label for="sharpness">Sharpness</label>
						<span class="text-gray-400">{sharpness}%</span>
					</div>
					<input
						id="sharpness"
						type="range"
						min="0"
						max="100"
						bind:value={sharpness}
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
					/>
				</div>
				<button
					type="button"
					onclick={resetEnhancements}
					disabled={!hasEnhancements}
					class="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
				>
					Reset Enhancements
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Cropper.js customizations */
	:global(.cropper-container) {
		max-width: 100%;
		max-height: 100%;
	}

	:global(.cropper-view-box) {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	:global(.cropper-point) {
		background-color: #3b82f6;
		width: 12px !important;
		height: 12px !important;
	}

	:global(.cropper-line) {
		background-color: #3b82f6;
	}

	/* Range input styling */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
		border: none;
	}
</style>
