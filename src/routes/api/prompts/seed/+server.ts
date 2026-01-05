import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';
import { DEFAULT_EXTRACTION_PROMPT, DEFAULT_FORMULATION_PROMPT } from '$lib/ai/prompt';
import type { AIProvider, PromptType } from '$lib/pocketbase/types';

const PROVIDERS: AIProvider[] = ['gemini', 'groq', 'claude', 'openai', 'cloudvision'];
const PROMPT_TYPES: PromptType[] = ['extraction', 'formulation'];

// POST - Seed the prompts collection with defaults
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const created: { provider: AIProvider; type: PromptType; id: string }[] = [];
		const skipped: { provider: AIProvider; type: PromptType; reason: string }[] = [];

		for (const provider of PROVIDERS) {
			for (const promptType of PROMPT_TYPES) {
				// Check if a prompt already exists for this provider/type
				const existing = await serverPB.prompts.getByProvider(provider);
				const hasExisting = existing.some(p => p.prompt_type === promptType);

				if (hasExisting) {
					skipped.push({
						provider,
						type: promptType,
						reason: 'Already exists'
					});
					continue;
				}

				// Create the default prompt
				const content = promptType === 'extraction'
					? DEFAULT_EXTRACTION_PROMPT
					: DEFAULT_FORMULATION_PROMPT;

				const prompt = await serverPB.prompts.create({
					name: `Default ${promptType.charAt(0).toUpperCase() + promptType.slice(1)} Prompt`,
					provider,
					prompt_type: promptType,
					content,
					description: `Default ${promptType} prompt for ${provider}`,
					is_active: true // Set as active by default
				});

				created.push({
					provider,
					type: promptType,
					id: prompt.id
				});
			}
		}

		return json({
			success: true,
			message: `Seeded ${created.length} prompts, skipped ${skipped.length}`,
			created,
			skipped
		});
	} catch (err) {
		console.error('Prompt seed error:', err);
		throw error(500, 'An error occurred while seeding prompts');
	}
};
