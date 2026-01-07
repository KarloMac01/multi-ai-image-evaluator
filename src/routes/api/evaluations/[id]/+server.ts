import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB, getServerPB } from '$lib/pocketbase/server';
import { COLLECTIONS } from '$lib/pocketbase/client';
import type { Evaluation } from '$lib/pocketbase/types';

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

		// Get previous and next evaluation IDs for navigation
		// List is sorted by -created (newest first), so:
		// - Previous: evaluation created AFTER current (newer, earlier in list)
		// - Next: evaluation created BEFORE current (older, later in list)
		const pb = getServerPB();

		let previousId: string | null = null;
		let nextId: string | null = null;

		try {
			// Get previous (newer) evaluation
			const newerResult = await pb.collection(COLLECTIONS.EVALUATIONS).getList<Evaluation>(1, 1, {
				filter: `created > "${evaluation.created}"`,
				sort: 'created' // Ascending to get the closest newer one
			});
			if (newerResult.items.length > 0) {
				previousId = newerResult.items[0].id;
			}

			// Get next (older) evaluation
			const olderResult = await pb.collection(COLLECTIONS.EVALUATIONS).getList<Evaluation>(1, 1, {
				filter: `created < "${evaluation.created}"`,
				sort: '-created' // Descending to get the closest older one
			});
			if (olderResult.items.length > 0) {
				nextId = olderResult.items[0].id;
			}
		} catch (navErr) {
			console.error('Error fetching navigation:', navErr);
			// Continue without navigation - not critical
		}

		return json({
			success: true,
			evaluation: {
				...evaluation,
				imageUrl
			},
			aiResults,
			webResults,
			navigation: {
				previousId,
				nextId
			}
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
