<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		showRawJson?: boolean;
		imageUrl?: string | null;
	}

	let { data, showRawJson = true, imageUrl = null }: Props = $props();
	let jsonExpanded = $state(false);

	// Helper to check if a value is empty/blank
	function isEmpty(value: unknown): boolean {
		if (value === null || value === undefined) return true;
		if (typeof value === 'string' && value.trim() === '') return true;
		if (Array.isArray(value) && value.length === 0) return true;
		if (typeof value === 'object' && Object.keys(value as object).length === 0) return true;
		return false;
	}

	// Format field name for display
	function formatFieldName(key: string): string {
		return key
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Get field sections for organized display
	const fieldSections = $derived.by(() => {
		const sections: {
			title: string;
			icon: string;
			fields: { key: string; label: string; value: unknown }[];
		}[] = [];

		// Basic Info
		const basicFields = ['product_name', 'brand', 'manufacturer', 'formulation_type', 'net_contents'];
		const basicInfo = basicFields
			.filter((key) => !isEmpty(data[key]))
			.map((key) => ({ key, label: formatFieldName(key), value: data[key] }));
		if (basicInfo.length > 0) {
			sections.push({ title: 'Product Information', icon: 'box', fields: basicInfo });
		}

		// Identifiers
		const idFields = ['ndc_code', 'upc_code', 'lot_number', 'expiration_date'];
		const identifiers = idFields
			.filter((key) => !isEmpty(data[key]))
			.map((key) => ({ key, label: formatFieldName(key), value: data[key] }));
		if (identifiers.length > 0) {
			sections.push({ title: 'Identifiers & Dates', icon: 'tag', fields: identifiers });
		}

		// Drug Facts
		if (!isEmpty(data.drug_facts)) {
			sections.push({
				title: 'Drug Facts',
				icon: 'pill',
				fields: [{ key: 'drug_facts', label: 'Drug Facts', value: data.drug_facts }]
			});
		}

		// Supplement Facts
		if (!isEmpty(data.supplement_facts)) {
			sections.push({
				title: 'Supplement Facts',
				icon: 'leaf',
				fields: [{ key: 'supplement_facts', label: 'Supplement Facts', value: data.supplement_facts }]
			});
		}

		// Dosage & Instructions
		const dosageFields = ['dosage_instructions', 'directions'];
		const dosage = dosageFields
			.filter((key) => !isEmpty(data[key]))
			.map((key) => ({ key, label: formatFieldName(key), value: data[key] }));
		if (dosage.length > 0) {
			sections.push({ title: 'Dosage & Directions', icon: 'clipboard', fields: dosage });
		}

		// Safety Information
		const safetyFields = ['warnings_contraindications', 'drug_interactions', 'storage_conditions'];
		const safety = safetyFields
			.filter((key) => !isEmpty(data[key]))
			.map((key) => ({ key, label: formatFieldName(key), value: data[key] }));
		if (safety.length > 0) {
			sections.push({ title: 'Safety & Storage', icon: 'alert', fields: safety });
		}

		// Other fields not covered above
		const coveredFields = new Set([
			...basicFields,
			...idFields,
			'drug_facts',
			'supplement_facts',
			...dosageFields,
			...safetyFields,
			'_raw_ocr_text' // Skip internal fields
		]);
		const otherFields = Object.keys(data)
			.filter((key) => !coveredFields.has(key) && !isEmpty(data[key]))
			.map((key) => ({ key, label: formatFieldName(key), value: data[key] }));
		if (otherFields.length > 0) {
			sections.push({ title: 'Additional Information', icon: 'info', fields: otherFields });
		}

		return sections;
	});
</script>

{#snippet icon(name: string)}
	{#if name === 'box'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
		</svg>
	{:else if name === 'tag'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
		</svg>
	{:else if name === 'pill'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
		</svg>
	{:else if name === 'leaf'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
		</svg>
	{:else if name === 'clipboard'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
		</svg>
	{:else if name === 'alert'}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
		</svg>
	{:else}
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	{/if}
{/snippet}

{#snippet renderValue(value: unknown, depth: number = 0)}
	{#if typeof value === 'string'}
		<span class="text-gray-900">{value}</span>
	{:else if typeof value === 'number'}
		<span class="text-blue-600 font-medium">{value}</span>
	{:else if typeof value === 'boolean'}
		<span class="text-purple-600 font-medium">{value ? 'Yes' : 'No'}</span>
	{:else if Array.isArray(value)}
		{#if value.length === 0}
			<span class="text-gray-400 italic">None</span>
		{:else if typeof value[0] === 'string'}
			<ul class="list-disc list-inside space-y-1 text-gray-700">
				{#each value as item, idx (idx)}
					<li class="text-sm">{item}</li>
				{/each}
			</ul>
		{:else}
			<div class="space-y-2">
				{#each value as item, idx (idx)}
					{#if typeof item === 'object' && item !== null}
						<div class="bg-gray-50 rounded-lg p-3 {idx > 0 ? 'mt-2' : ''}">
							{@render renderObject(item as Record<string, unknown>, depth + 1)}
						</div>
					{:else}
						<div class="text-sm text-gray-700">{String(item)}</div>
					{/if}
				{/each}
			</div>
		{/if}
	{:else if typeof value === 'object' && value !== null}
		{@render renderObject(value as Record<string, unknown>, depth + 1)}
	{:else}
		<span class="text-gray-400 italic">—</span>
	{/if}
{/snippet}

{#snippet renderObject(obj: Record<string, unknown>, depth: number = 0)}
	<dl class="space-y-2">
		{#each Object.entries(obj) as [key, val] (key)}
			{#if !isEmpty(val)}
				<div class="{depth > 0 ? '' : 'py-1'}">
					<dt class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
						{formatFieldName(key)}
					</dt>
					<dd class="text-sm">
						{@render renderValue(val, depth)}
					</dd>
				</div>
			{/if}
		{/each}
	</dl>
{/snippet}

<div class="space-y-4">
	{#if fieldSections.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No data available</p>
		</div>
	{:else}
		{#each fieldSections as section (section.title)}
			<div class="border border-gray-200 rounded-lg overflow-hidden">
				<div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
					<h3 class="flex items-center gap-2 text-sm font-semibold text-gray-700">
						<span class="text-gray-500">{@render icon(section.icon)}</span>
						{section.title}
					</h3>
				</div>
				<div class="p-4">
					{#if section.title === 'Product Information' && imageUrl}
						<!-- Product Information with Image -->
						<div class="flex flex-col sm:flex-row gap-4">
							<div class="sm:w-1/3 flex-shrink-0">
								<img
									src={imageUrl}
									alt={String(data.product_name || 'Product label')}
									class="w-full h-auto rounded-lg border border-gray-200 shadow-sm object-contain max-h-64 sm:max-h-80"
								/>
							</div>
							<div class="sm:w-2/3 space-y-4">
								{#each section.fields as field (field.key)}
									<div>
										<dt class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											{field.label}
										</dt>
										<dd class="text-sm">
											{@render renderValue(field.value)}
										</dd>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<!-- Standard section layout -->
						<div class="space-y-4">
							{#each section.fields as field (field.key)}
								{#if field.key === 'drug_facts' || field.key === 'supplement_facts'}
									<!-- Special handling for complex nested objects -->
									{@render renderObject(field.value as Record<string, unknown>)}
								{:else}
									<div>
										<dt class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											{field.label}
										</dt>
										<dd class="text-sm">
											{@render renderValue(field.value)}
										</dd>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}

	<!-- Collapsible Raw JSON -->
	{#if showRawJson}
		<div class="border border-gray-200 rounded-lg overflow-hidden">
			<button
				type="button"
				onclick={() => jsonExpanded = !jsonExpanded}
				class="w-full bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
			>
				<span class="flex items-center gap-2 text-sm font-semibold text-gray-700">
					<svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
					</svg>
					Raw JSON
				</span>
				<svg
					class="h-5 w-5 text-gray-400 transition-transform {jsonExpanded ? 'rotate-180' : ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if jsonExpanded}
				<div class="p-4 bg-gray-900 overflow-auto max-h-96">
					<pre class="text-xs text-green-400 font-mono">{JSON.stringify(data, null, 2)}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
