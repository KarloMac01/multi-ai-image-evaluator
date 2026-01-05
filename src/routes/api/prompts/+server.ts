import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';
import { DEFAULT_EXTRACTION_PROMPT, DEFAULT_FORMULATION_PROMPT } from '$lib/ai/prompt';
import type { AIProvider, PromptType } from '$lib/pocketbase/types';

// GET - List all prompts
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const provider = url.searchParams.get('provider') as AIProvider | null;

		let prompts;
		if (provider) {
			prompts = await serverPB.prompts.getByProvider(provider);
		} else {
			prompts = await serverPB.prompts.list();
		}

		// Also get the active prompts for quick reference
		const activePrompts = await serverPB.prompts.getActivePrompts();

		return json({
			success: true,
			prompts,
			activePrompts,
			defaults: {
				extraction: DEFAULT_EXTRACTION_PROMPT,
				formulation: DEFAULT_FORMULATION_PROMPT
			}
		});
	} catch (err) {
		console.error('Prompts list error:', err);
		throw error(500, 'An error occurred while fetching prompts');
	}
};

// POST - Create a new prompt
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const body = await request.json();
		const { name, provider, prompt_type, content, description, is_active } = body;

		// Validate required fields
		if (!name || typeof name !== 'string') {
			throw error(400, 'name is required');
		}
		if (!provider || !['gemini', 'groq', 'claude', 'openai', 'cloudvision'].includes(provider)) {
			throw error(400, 'valid provider is required');
		}
		if (!prompt_type || !['extraction', 'formulation'].includes(prompt_type)) {
			throw error(400, 'prompt_type must be "extraction" or "formulation"');
		}
		if (!content || typeof content !== 'string') {
			throw error(400, 'content is required');
		}

		const prompt = await serverPB.prompts.create({
			name,
			provider,
			prompt_type,
			content,
			description: description || '',
			is_active: is_active || false
		});

		// If this prompt should be active, deactivate others
		if (is_active) {
			await serverPB.prompts.setActive(prompt.id, provider, prompt_type);
		}

		return json({
			success: true,
			prompt
		});
	} catch (err) {
		console.error('Prompt create error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while creating the prompt');
	}
};
