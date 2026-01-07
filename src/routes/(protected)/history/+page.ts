import type { PageLoad } from './$types';
import type { AIProvider } from '$lib/pocketbase/types';

export interface AIResultSummary {
	provider: AIProvider;
	status: string;
	duration_ms?: number;
}

export interface EvaluationListItem {
	id: string;
	product_name?: string;
	status: string;
	created: string;
	total_duration_ms?: number;
	thumbnailUrl: string;
	imageUrl: string;
	aiResults: AIResultSummary[];
}

export interface PaginationInfo {
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
}

export const load: PageLoad = async ({ fetch, url, depends }) => {
	// Register dependency for cache invalidation
	depends('app:evaluations');

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const perPage = 10;

	try {
		const response = await fetch(`/api/evaluations?page=${page}&perPage=${perPage}`);
		const data = await response.json();

		if (!response.ok) {
			return {
				evaluations: [] as EvaluationListItem[],
				pagination: null as PaginationInfo | null,
				error: data.message || 'Failed to load evaluations'
			};
		}

		return {
			evaluations: data.evaluations as EvaluationListItem[],
			pagination: data.pagination as PaginationInfo,
			error: null
		};
	} catch (err) {
		console.error('Failed to load evaluations:', err);
		return {
			evaluations: [] as EvaluationListItem[],
			pagination: null as PaginationInfo | null,
			error: 'Failed to load evaluations'
		};
	}
};
