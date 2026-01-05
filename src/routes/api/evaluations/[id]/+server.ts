import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { id } = params;

	if (!id) {
		throw error(400, 'Evaluation ID is required');
	}

	try {
		// Get the evaluation
		const evaluation = await serverPB.evaluations.getOne(id);

		// Get associated AI results
		const aiResults = await serverPB.aiResults.getByEvaluation(id);

		// Get associated web results
		const webResults = await serverPB.webResults.getByEvaluation(id);

		// Get image URL
		const imageUrl = serverPB.evaluations.getImageUrl(evaluation);

		return json({
			success: true,
			evaluation: {
				...evaluation,
				imageUrl
			},
			aiResults,
			webResults
		});
	} catch (err) {
		console.error(`Evaluation ${id} fetch error:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			// Check if it's a 404 from Pocketbase
			const pbError = err as { status: number };
			if (pbError.status === 404) {
				throw error(404, 'Evaluation not found');
			}
			throw err;
		}

		throw error(500, 'An error occurred while fetching the evaluation');
	}
};
