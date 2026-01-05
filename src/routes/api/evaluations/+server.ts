import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = parseInt(url.searchParams.get('perPage') || '20', 10);

		const result = await serverPB.evaluations.list(page, perPage);

		return json({
			success: true,
			evaluations: result.items,
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
