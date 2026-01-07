import type { PageLoad } from './$types';
import type { AIProvider } from '$lib/pocketbase/types';

export interface EvaluationData {
	id: string;
	product_name: string;
	status: string;
	created: string;
	total_duration_ms: number;
	imageUrl: string;
	image: string;
}

export interface AIResultData {
	id: string;
	provider: AIProvider;
	status: string;
	extracted_data?: Record<string, unknown>;
	formulation?: Record<string, unknown>;
	duration_ms?: number;
	error_message?: string;
	tokens_used?: number;
}

export interface NavigationData {
	previousId: string | null;
	nextId: string | null;
}

export const load: PageLoad = async ({ fetch, params, depends }) => {
	// Register dependency for potential cache invalidation
	depends('app:evaluation');

	try {
		const response = await fetch(`/api/evaluations/${params.id}`);
		const data = await response.json();

		if (!response.ok) {
			if (response.status === 404) {
				return {
					evaluation: null as EvaluationData | null,
					aiResults: [] as AIResultData[],
					navigation: { previousId: null, nextId: null } as NavigationData,
					error: 'Evaluation not found'
				};
			}
			return {
				evaluation: null as EvaluationData | null,
				aiResults: [] as AIResultData[],
				navigation: { previousId: null, nextId: null } as NavigationData,
				error: data.message || 'Failed to load evaluation'
			};
		}

		return {
			evaluation: data.evaluation as EvaluationData,
			aiResults: (data.aiResults || []) as AIResultData[],
			navigation: (data.navigation || { previousId: null, nextId: null }) as NavigationData,
			error: null
		};
	} catch (err) {
		console.error('Failed to load evaluation:', err);
		return {
			evaluation: null as EvaluationData | null,
			aiResults: [] as AIResultData[],
			navigation: { previousId: null, nextId: null } as NavigationData,
			error: 'Failed to load evaluation'
		};
	}
};
