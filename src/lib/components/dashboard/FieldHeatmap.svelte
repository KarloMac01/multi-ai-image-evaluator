<script lang="ts">
	interface FieldRecognition {
		field: string;
		category: string;
		byProvider: Record<string, number>;
	}

	interface Props {
		fieldRecognition: FieldRecognition[];
	}

	let { fieldRecognition }: Props = $props();

	const providers = ['gemini', 'groq', 'claude', 'openai', 'cloudvision'];
	const providerNames: Record<string, string> = {
		gemini: 'Gemini',
		groq: 'Groq',
		claude: 'Claude',
		openai: 'OpenAI',
		cloudvision: 'Vision'
	};

	const fieldLabels: Record<string, string> = {
		product_name: 'Product Name',
		brand: 'Brand',
		manufacturer: 'Manufacturer',
		formulation_type: 'Formulation',
		ndc_code: 'NDC Code',
		net_contents: 'Net Contents',
		cannabis_info: 'Cannabis Info',
		cannabis_facts: 'Cannabis Facts',
		drug_facts: 'Drug Facts',
		supplement_facts: 'Supplement Facts'
	};

	// Color scale: 0% (red) -> 50% (yellow) -> 100% (green)
	function getColor(value: number): string {
		if (value === 0) return 'bg-gray-100 text-gray-400';
		if (value < 25) return 'bg-red-100 text-red-700';
		if (value < 50) return 'bg-orange-100 text-orange-700';
		if (value < 75) return 'bg-yellow-100 text-yellow-700';
		if (value < 90) return 'bg-lime-100 text-lime-700';
		return 'bg-green-100 text-green-700';
	}

	// Group fields by category
	const groupedFields = $derived(() => {
		const groups: Record<string, FieldRecognition[]> = {
			'top-level': [],
			cannabis: [],
			drug: [],
			supplement: []
		};

		for (const field of fieldRecognition) {
			if (groups[field.category]) {
				groups[field.category].push(field);
			}
		}

		return groups;
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
	<h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">Field Recognition Rates</h3>

	<div class="overflow-x-auto">
		<table class="min-w-full">
			<thead>
				<tr>
					<th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 pr-4 sticky left-0 bg-white">
						Field
					</th>
					{#each providers as provider}
						<th class="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2 min-w-[70px]">
							{providerNames[provider]}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each fieldRecognition as field (field.field)}
					<tr class="hover:bg-gray-50">
						<td class="py-2 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white whitespace-nowrap">
							{fieldLabels[field.field] || field.field}
						</td>
						{#each providers as provider}
							{@const value = field.byProvider[provider] ?? 0}
							<td class="py-2 px-2 text-center">
								<span class="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-semibold {getColor(value)}">
									{value}%
								</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Legend -->
	<div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
		<span>Legend:</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-gray-100"></span>
			0%
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-red-100"></span>
			&lt;25%
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-orange-100"></span>
			25-49%
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-yellow-100"></span>
			50-74%
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-lime-100"></span>
			75-89%
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="w-4 h-4 rounded bg-green-100"></span>
			90%+
		</span>
	</div>
</div>
