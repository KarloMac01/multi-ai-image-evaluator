import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, updateSettings, resetSettings, getDefaultSettings } from '$lib/settings';

export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const settings = getSettings();
		const defaults = getDefaultSettings();

		return json({
			success: true,
			settings,
			defaults
		});
	} catch (err) {
		console.error('Settings fetch error:', err);
		throw error(500, 'An error occurred while fetching settings');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const body = await request.json();
		const { extraction_prompt, formulation_prompt, default_providers } = body;

		// Validate inputs
		if (extraction_prompt !== undefined && typeof extraction_prompt !== 'string') {
			throw error(400, 'extraction_prompt must be a string');
		}
		if (formulation_prompt !== undefined && typeof formulation_prompt !== 'string') {
			throw error(400, 'formulation_prompt must be a string');
		}
		if (default_providers !== undefined && !Array.isArray(default_providers)) {
			throw error(400, 'default_providers must be an array');
		}

		// Build update object with only provided fields
		const updates: Record<string, unknown> = {};
		if (extraction_prompt !== undefined) {
			updates.extraction_prompt = extraction_prompt;
		}
		if (formulation_prompt !== undefined) {
			updates.formulation_prompt = formulation_prompt;
		}
		if (default_providers !== undefined) {
			updates.default_providers = default_providers;
		}

		const settings = updateSettings(updates);

		return json({
			success: true,
			settings
		});
	} catch (err) {
		console.error('Settings update error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while saving settings');
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const settings = resetSettings();

		return json({
			success: true,
			message: 'Settings reset to defaults',
			settings
		});
	} catch (err) {
		console.error('Settings reset error:', err);
		throw error(500, 'An error occurred while resetting settings');
	}
};
