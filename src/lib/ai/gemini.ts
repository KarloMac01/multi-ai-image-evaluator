import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * Google Gemini AI Service
 * Uses Gemini 2.0 Flash for vision capabilities
 * Free tier: ~1000 requests/day, no credit card required
 */
export class GeminiService extends BaseAIService {
	readonly name: AIProvider = 'gemini';
	readonly displayName = 'Google Gemini';
	protected get apiKey(): string {
		return env.GEMINI_API_KEY || '';
	}

	private client: GoogleGenerativeAI | null = null;

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	private getClient(): GoogleGenerativeAI {
		if (!this.client) {
			this.client = new GoogleGenerativeAI(this.apiKey);
		}
		return this.client;
	}

	protected async callAPI(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
		const client = this.getClient();

		// Use Gemini 2.0 Flash for best balance of speed and capability
		const model = client.getGenerativeModel({
			model: 'gemini-2.0-flash-exp',
			generationConfig: {
				temperature: 0.1, // Low temperature for consistent extraction
				maxOutputTokens: 8192
			}
		});

		const imagePart = {
			inlineData: {
				data: imageBase64,
				mimeType
			}
		};

		const result = await withRetry(async () => {
			const response = await model.generateContent([prompt, imagePart]);
			return response.response.text();
		});

		return result;
	}
}

// Export singleton instance
export const geminiService = new GeminiService();
