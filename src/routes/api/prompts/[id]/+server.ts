import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';

// GET - Get a single prompt
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Prompt ID is required');
	}

	try {
		const prompt = await serverPB.prompts.getOne(id);

		return json({
			success: true,
			prompt
		});
	} catch (err) {
		console.error(`Prompt ${id} fetch error:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			const pbError = err as { status: number };
			if (pbError.status === 404) {
				throw error(404, 'Prompt not found');
			}
			throw err;
		}

		throw error(500, 'An error occurred while fetching the prompt');
	}
};

// PATCH - Update a prompt
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Prompt ID is required');
	}

	try {
		const body = await request.json();
		const { name, content, description, is_active } = body;

		// Build update object
		const updates: Record<string, unknown> = {};
		if (name !== undefined) updates.name = name;
		if (content !== undefined) updates.content = content;
		if (description !== undefined) updates.description = description;

		// Get the current prompt to know its provider and type
		const currentPrompt = await serverPB.prompts.getOne(id);

		// Handle is_active separately - need to deactivate others
		if (is_active === true) {
			await serverPB.prompts.setActive(id, currentPrompt.provider, currentPrompt.prompt_type);
		} else if (is_active === false) {
			updates.is_active = false;
		}

		// Apply other updates
		const prompt = Object.keys(updates).length > 0
			? await serverPB.prompts.update(id, updates)
			: await serverPB.prompts.getOne(id);

		return json({
			success: true,
			prompt
		});
	} catch (err) {
		console.error(`Prompt ${id} update error:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while updating the prompt');
	}
};

// DELETE - Delete a prompt
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Prompt ID is required');
	}

	try {
		await serverPB.prompts.delete(id);

		return json({
			success: true,
			message: 'Prompt deleted'
		});
	} catch (err) {
		console.error(`Prompt ${id} delete error:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while deleting the prompt');
	}
};
