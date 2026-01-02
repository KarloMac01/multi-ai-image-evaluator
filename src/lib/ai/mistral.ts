import { Mistral } from '@mistralai/mistralai';
import { MISTRAL_API_KEY } from '$env/static/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * Mistral AI Service
 * Uses Pixtral 12B for vision capabilities
 * Free tier: 500K tokens/min, 1 req/sec
 */
export class MistralService extends BaseAIService {
	readonly name: AIProvider = 'mistral';
	readonly displayName = 'Mistral (Pixtral)';
	protected readonly apiKey = MISTRAL_API_KEY || '';

	private client: Mistral | null = null;

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	private getClient(): Mistral {
		if (!this.client) {
			this.client = new Mistral({ apiKey: this.apiKey });
		}
		return this.client;
	}

	protected async callAPI(imageBase64: string, mimeType: string): Promise<string> {
		const client = this.getClient();

		// Construct the data URL for the image
		const imageUrl = `data:${mimeType};base64,${imageBase64}`;

		const result = await withRetry(async () => {
			const response = await client.chat.complete({
				model: 'pixtral-12b-2409',
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								imageUrl: imageUrl
							},
							{
								type: 'text',
								text: this.getPrompt()
							}
						]
					}
				],
				temperature: 0.1,
				maxTokens: 8192
			});

			const content = response.choices?.[0]?.message?.content;
			if (typeof content === 'string') {
				return content;
			}
			// Handle case where content might be an array of content blocks
			if (Array.isArray(content)) {
				return content
					.filter((block): block is { type: 'text'; text: string } => block.type === 'text')
					.map((block) => block.text)
					.join('');
			}
			return '';
		});

		return result;
	}
}

// Export singleton instance
export const mistralService = new MistralService();
