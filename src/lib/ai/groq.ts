import Groq from 'groq-sdk';
import { env } from '$env/dynamic/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * Groq AI Service
 * Uses Llama 4 Scout for vision capabilities with ultra-fast inference
 * Free tier: 14,400 requests/day, no credit card required
 */
export class GroqService extends BaseAIService {
	readonly name: AIProvider = 'groq';
	readonly displayName = 'Groq (Llama 4)';
	protected get apiKey(): string {
		return env.GROQ_API_KEY || '';
	}

	private client: Groq | null = null;

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	private getClient(): Groq {
		if (!this.client) {
			this.client = new Groq({ apiKey: this.apiKey });
		}
		return this.client;
	}

	protected async callAPI(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
		const client = this.getClient();

		// Construct the data URL for the image
		const imageUrl = `data:${mimeType};base64,${imageBase64}`;

		const result = await withRetry(async () => {
			const response = await client.chat.completions.create({
				model: 'meta-llama/llama-4-scout-17b-16e-instruct',
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								image_url: {
									url: imageUrl
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
export const groqService = new GroqService();
