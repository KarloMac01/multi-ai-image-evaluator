import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { browser } from '$app/environment';
import type {
	Evaluation,
	AIResult,
	WebResult,
	CreateEvaluation,
	CreateAIResult,
	CreateWebResult,
	EvaluationWithResults
} from './types';

// Client-side PocketBase instance
export function createPocketBase(): PocketBase {
	const pb = new PocketBase(PUBLIC_POCKETBASE_URL);

	// Load auth from cookie on browser
	if (browser) {
		pb.authStore.loadFromCookie(document.cookie);

		// Keep auth store in sync with cookie changes
		pb.authStore.onChange(() => {
			document.cookie = pb.authStore.exportToCookie({
				httpOnly: false,
				sameSite: 'lax',
				path: '/'
			});
		});
	}

	return pb;
}

// Singleton for client-side usage
let clientPB: PocketBase | null = null;

export function getClientPB(): PocketBase {
	if (!clientPB) {
		clientPB = createPocketBase();
	}
	// Ensure auth is loaded from cookie on each call (in case cookie changed)
	if (browser && clientPB) {
		clientPB.authStore.loadFromCookie(document.cookie);
	}
	return clientPB;
}

// Collection names
export const COLLECTIONS = {
	EVALUATIONS: 'evaluations',
	AI_RESULTS: 'ai_results',
	WEB_RESULTS: 'web_results',
	PROMPTS: 'prompts'
} as const;

// Type-safe collection helpers
export const pb = {
	// Evaluation operations
	evaluations: {
		async create(data: CreateEvaluation, image?: File): Promise<Evaluation> {
			const pb = getClientPB();
			const formData = new FormData();

			if (image) {
				formData.append('image', image);
			}
			formData.append('status', data.status);
			if (data.product_name) {
				formData.append('product_name', data.product_name);
			}

			return pb.collection(COLLECTIONS.EVALUATIONS).create<Evaluation>(formData);
		},

		async getOne(id: string): Promise<Evaluation> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.EVALUATIONS).getOne<Evaluation>(id);
		},

		async getWithResults(id: string): Promise<EvaluationWithResults> {
			const pb = getClientPB();
			const evaluation = await pb.collection(COLLECTIONS.EVALUATIONS).getOne<Evaluation>(id);

			// Get related AI results
			const aiResults = await pb.collection(COLLECTIONS.AI_RESULTS).getFullList<AIResult>({
				filter: `evaluation="${id}"`
			});

			// Get related web results
			const webResults = await pb.collection(COLLECTIONS.WEB_RESULTS).getFullList<WebResult>({
				filter: `evaluation="${id}"`
			});

			return {
				...evaluation,
				expand: {
					ai_results: aiResults,
					web_results: webResults
				}
			};
		},

		async list(page = 1, perPage = 20): Promise<{ items: Evaluation[]; totalPages: number; totalItems: number }> {
			const pb = getClientPB();
			const result = await pb.collection(COLLECTIONS.EVALUATIONS).getList<Evaluation>(page, perPage, {
				sort: '-created'
			});
			return {
				items: result.items,
				totalPages: result.totalPages,
				totalItems: result.totalItems
			};
		},

		async update(id: string, data: Partial<Evaluation>): Promise<Evaluation> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.EVALUATIONS).update<Evaluation>(id, data);
		},

		getImageUrl(evaluation: Evaluation): string {
			const pb = getClientPB();
			return pb.files.getURL(evaluation, evaluation.image);
		}
	},

	// AI Results operations
	aiResults: {
		async create(data: CreateAIResult): Promise<AIResult> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).create<AIResult>(data);
		},

		async getByEvaluation(evaluationId: string): Promise<AIResult[]> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).getFullList<AIResult>({
				filter: `evaluation="${evaluationId}"`,
				sort: 'provider'
			});
		},

		async update(id: string, data: Partial<AIResult>): Promise<AIResult> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.AI_RESULTS).update<AIResult>(id, data);
		}
	},

	// Web Results operations
	webResults: {
		async create(data: CreateWebResult): Promise<WebResult> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.WEB_RESULTS).create<WebResult>(data);
		},

		async getByEvaluation(evaluationId: string): Promise<WebResult[]> {
			const pb = getClientPB();
			return pb.collection(COLLECTIONS.WEB_RESULTS).getFullList<WebResult>({
				filter: `evaluation="${evaluationId}"`,
				sort: '-confidence_score'
			});
		}
	}
};

export default pb;
