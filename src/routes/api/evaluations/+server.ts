import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';
import type { AIProvider } from '$lib/pocketbase/types';

interface AIResultSummary {
	provider: AIProvider;
	status: string;
	duration_ms?: number;
}

interface EvaluationListItem {
	id: string;
	product_name?: string;
	status: string;
	created: string;
	total_duration_ms?: number;
	thumbnailUrl: string;
	imageUrl: string;
	aiResults: AIResultSummary[];
}

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = parseInt(url.searchParams.get('perPage') || '10', 10);

		const result = await serverPB.evaluations.list(page, perPage);

		// Fetch AI results for each evaluation and build response
		const evaluationsWithResults: EvaluationListItem[] = await Promise.all(
			result.items.map(async (evaluation) => {
				// Get AI results for this evaluation
				const aiResults = await serverPB.aiResults.getByEvaluation(evaluation.id);

				return {
					id: evaluation.id,
					product_name: evaluation.product_name,
					status: evaluation.status,
					created: evaluation.created,
					total_duration_ms: evaluation.total_duration_ms,
					thumbnailUrl: serverPB.evaluations.getImageUrl(evaluation, { thumb: '100x100' }),
					imageUrl: serverPB.evaluations.getImageUrl(evaluation),
					aiResults: aiResults.map((r) => ({
						provider: r.provider,
						status: r.status,
						duration_ms: r.duration_ms
					}))
				};
			})
		);

		return json({
			success: true,
			evaluations: evaluationsWithResults,
			pagination: {
				page,
				perPage,
				totalPages: result.totalPages,
				totalItems: result.totalItems
			}
		});
	} catch (err) {
		console.error('Evaluations list error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while fetching evaluations');
	}
};
