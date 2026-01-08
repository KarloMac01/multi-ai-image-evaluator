import PocketBase from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type {
	Evaluation,
	AIResult,
	WebResult,
	Prompt,
	CreateEvaluation,
	CreateAIResult,
	CreateWebResult,
	CreatePrompt,
	AIProvider,
	PromptType
} from './types';
import { COLLECTIONS } from './client';

// Server-side PocketBase instance with API key
export function getServerPB(): PocketBase {
	const pb = new PocketBase(publicEnv.PUBLIC_POCKETBASE_URL);

	// Add API key header for server requests
	if (privateEnv.POCKETBASE_SERVER_API_KEY) {
		pb.beforeSend = function (url, options) {
			options.headers = {
				...options.headers,
				'x-api-key': privateEnv.POCKETBASE_SERVER_API_KEY
			};
			return { url, options };
		};
	}

	return pb;
}

// Server-side collection helpers
export const serverPB = {
	// Evaluation operations
	evaluations: {
		async create(data: Pick<CreateEvaluation, 'status' | 'product_name' | 'user'>, imageFile?: File | Blob): Promise<Evaluation> {
			const pb = getServerPB();
			const formData = new FormData();

			if (imageFile) {
				formData.append('image', imageFile);
				console.log(`Uploading image: ${imageFile instanceof File ? imageFile.name : 'blob'}, size: ${imageFile.size} bytes, type: ${imageFile.type}`);
			} else {
				console.warn('No image provided for evaluation');
			}
			formData.append('user', data.user);
			formData.append('status', data.status);
			if (data.product_name) {
				formData.append('product_name', data.product_name);
			}

			const evaluation = await pb.collection(COLLECTIONS.EVALUATIONS).create<Evaluation>(formData);
			console.log(`Created evaluation ${evaluation.id}, image field: "${evaluation.image}"`);
			return evaluation;
		},

		async getOne(id: string): Promise<Evaluation> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.EVALUATIONS).getOne<Evaluation>(id);
		},

		async update(id: string, data: Partial<Evaluation>): Promise<Evaluation> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.EVALUATIONS).update<Evaluation>(id, data);
		},

		async list(page = 1, perPage = 20): Promise<{ items: Evaluation[]; totalPages: number; totalItems: number }> {
			const pb = getServerPB();
			const result = await pb.collection(COLLECTIONS.EVALUATIONS).getList<Evaluation>(page, perPage, {
				sort: '-created'
			});
			return {
				items: result.items,
				totalPages: result.totalPages,
				totalItems: result.totalItems
			};
		},

		getImageUrl(evaluation: Evaluation, options?: { thumb?: string }): string {
			if (!evaluation.image) {
				console.warn(`Evaluation ${evaluation.id} has no image`);
				return '';
			}
			const pb = getServerPB();
			const url = pb.files.getURL(evaluation, evaluation.image, options);
			return url;
		}
	},

	// AI Results operations
	aiResults: {
		async create(data: CreateAIResult): Promise<AIResult> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).create<AIResult>(data);
		},

		async update(id: string, data: Partial<AIResult>): Promise<AIResult> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).update<AIResult>(id, data);
		},

		async getByEvaluation(evaluationId: string): Promise<AIResult[]> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).getFullList<AIResult>({
				filter: `evaluation="${evaluationId}"`,
				sort: 'provider'
			});
		}
	},

	// Web Results operations
	webResults: {
		async create(data: CreateWebResult): Promise<WebResult> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.WEB_RESULTS).create<WebResult>(data);
		},

		async getByEvaluation(evaluationId: string): Promise<WebResult[]> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.WEB_RESULTS).getFullList<WebResult>({
				filter: `evaluation="${evaluationId}"`,
				sort: '-confidence_score'
			});
		}
	},

	// Prompts operations
	prompts: {
		async create(data: CreatePrompt): Promise<Prompt> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).create<Prompt>(data);
		},

		async getOne(id: string): Promise<Prompt> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).getOne<Prompt>(id);
		},

		async update(id: string, data: Partial<Prompt>): Promise<Prompt> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).update<Prompt>(id, data);
		},

		async delete(id: string): Promise<boolean> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).delete(id);
		},

		async list(): Promise<Prompt[]> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).getFullList<Prompt>({
				sort: 'provider,prompt_type,name'
			});
		},

		async getByProvider(provider: AIProvider): Promise<Prompt[]> {
			const pb = getServerPB();
			return pb.collection(COLLECTIONS.PROMPTS).getFullList<Prompt>({
				filter: `provider="${provider}"`,
				sort: 'prompt_type,name'
			});
		},

		async getActivePrompt(provider: AIProvider, promptType: PromptType): Promise<Prompt | null> {
			const pb = getServerPB();
			try {
				const results = await pb.collection(COLLECTIONS.PROMPTS).getList<Prompt>(1, 1, {
					filter: `provider="${provider}" && prompt_type="${promptType}" && is_active=true`
				});
				return results.items.length > 0 ? results.items[0] : null;
			} catch {
				return null;
			}
		},

		async setActive(id: string, provider: AIProvider, promptType: PromptType): Promise<Prompt> {
			const pb = getServerPB();

			// First, deactivate all other prompts for this provider and type
			const existingActive = await pb.collection(COLLECTIONS.PROMPTS).getFullList<Prompt>({
				filter: `provider="${provider}" && prompt_type="${promptType}" && is_active=true`
			});

			for (const prompt of existingActive) {
				if (prompt.id !== id) {
					await pb.collection(COLLECTIONS.PROMPTS).update(prompt.id, { is_active: false });
				}
			}

			// Now activate the selected prompt
			return pb.collection(COLLECTIONS.PROMPTS).update<Prompt>(id, { is_active: true });
		},

		async getActivePrompts(): Promise<Record<AIProvider, { extraction?: Prompt; formulation?: Prompt }>> {
			const pb = getServerPB();
			const activePrompts = await pb.collection(COLLECTIONS.PROMPTS).getFullList<Prompt>({
				filter: 'is_active=true'
			});

			const result: Record<AIProvider, { extraction?: Prompt; formulation?: Prompt }> = {
				gemini: {},
				groq: {},
				claude: {},
				openai: {},
				cloudvision: {}
			};

			for (const prompt of activePrompts) {
				if (!result[prompt.provider]) {
					result[prompt.provider] = {};
				}
				result[prompt.provider][prompt.prompt_type] = prompt;
			}

			return result;
		}
	}
};

export default serverPB;
