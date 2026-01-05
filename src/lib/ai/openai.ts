import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * OpenAI Service
 * Uses GPT-4o Mini for vision capabilities
 * Paid: $5 initial credits (expire in 3 months)
 */
export class OpenAIService extends BaseAIService {
	readonly name: AIProvider = 'openai';
	readonly displayName = 'OpenAI (GPT-4o)';
	protected readonly apiKey = OPENAI_API_KEY || '';

	private client: OpenAI | null = null;

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	private getClient(): OpenAI {
		if (!this.client) {
			this.client = new OpenAI({ apiKey: this.apiKey });
		}
		return this.client;
	}

	protected async callAPI(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
		const client = this.getClient();

		// Construct the data URL for the image
		const imageUrl = `data:${mimeType};base64,${imageBase64}`;

		const result = await withRetry(async () => {
			const response = await client.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								image_url: {
									url: imageUrl,
									detail: 'high' // Use high detail for better text extraction
								}
							},
							{
								type: 'text',
								text: prompt
							}
						]
					}
				],
				temperature: 0.1,
				max_tokens: 8192,
				response_format: { type: 'json_object' }
			});

			return response.choices[0]?.message?.content || '';
		});

		return result;
	}
}

// Export singleton instance
export const openaiService = new OpenAIService();
