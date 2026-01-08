import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * Anthropic Claude AI Service
 * Uses Claude 3.5 Sonnet for vision capabilities
 * Paid API with usage-based pricing
 */
export class ClaudeService extends BaseAIService {
	readonly name: AIProvider = 'claude';
	readonly displayName = 'Anthropic Claude';
	protected get apiKey(): string {
		return env.ANTHROPIC_API_KEY || '';
	}

	private client: Anthropic | null = null;

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	private getClient(): Anthropic {
		if (!this.client) {
			this.client = new Anthropic({ apiKey: this.apiKey });
		}
		return this.client;
	}

	protected async callAPI(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
		const client = this.getClient();

		// Map common mime types to Anthropic's supported media types
		const mediaType = this.mapMimeType(mimeType);

		const result = await withRetry(async () => {
			const response = await client.messages.create({
				model: 'claude-sonnet-4-20250514',
				max_tokens: 8192,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: mediaType,
									data: imageBase64
								}
							},
							{
								type: 'text',
								text: prompt
							}
						]
					}
				]
			});

			// Extract text from the response
			const textContent = response.content.find((block) => block.type === 'text');
			return textContent?.type === 'text' ? textContent.text : '';
		});

		return result;
	}

	/**
	 * Map MIME types to Anthropic's supported media types
	 */
	private mapMimeType(mimeType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
		const typeMap: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
			'image/jpeg': 'image/jpeg',
			'image/jpg': 'image/jpeg',
			'image/png': 'image/png',
			'image/gif': 'image/gif',
			'image/webp': 'image/webp'
		};
		return typeMap[mimeType.toLowerCase()] || 'image/jpeg';
	}
}

// Export singleton instance
export const claudeService = new ClaudeService();
