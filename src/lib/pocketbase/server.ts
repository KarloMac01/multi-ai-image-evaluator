import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { POCKETBASE_SERVER_API_KEY } from '$env/static/private';
import type {
	Evaluation,
	AIResult,
	WebResult,
	CreateEvaluation,
	CreateAIResult,
	CreateWebResult
} from './types';
import { COLLECTIONS } from './client';

// Server-side PocketBase instance with API key
export function getServerPB(): PocketBase {
	const pb = new PocketBase(PUBLIC_POCKETBASE_URL);

	// Add API key header for server requests
	if (POCKETBASE_SERVER_API_KEY) {
		pb.beforeSend = function (url, options) {
			options.headers = {
				...options.headers,
				'x-api-key': POCKETBASE_SERVER_API_KEY
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
		async create(data: CreateEvaluation, imageBlob?: Blob, imageName?: string): Promise<Evaluation> {
			const pb = getServerPB();
			const formData = new FormData();

			if (imageBlob && imageName) {
				formData.append('image', imageBlob, imageName);
			}
			formData.append('status', data.status);
			if (data.product_name) {
				formData.append('product_name', data.product_name);
			}

			return pb.collection(COLLECTIONS.EVALUATIONS).create<Evaluation>(formData);
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

		getImageUrl(evaluation: Evaluation): string {
			const pb = getServerPB();
			return pb.files.getURL(evaluation, evaluation.image);
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
	}
};

export default serverPB;
