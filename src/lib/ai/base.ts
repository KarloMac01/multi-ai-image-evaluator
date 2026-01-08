import type { AIService, AIServiceResult } from './types';
import type { AIProvider, ExtractedData } from '$lib/pocketbase/types';
import { parseAIResponse, cleanResponse, validateExtractedData } from '$lib/utils/parsing';
import { withTiming } from '$lib/utils/timing';
import { EXTRACTION_PROMPT, getExtractionPromptForProvider } from './prompt';

/**
 * Base class for AI service implementations
 */
export abstract class BaseAIService implements AIService {
	abstract readonly name: AIProvider;
	abstract readonly displayName: string;
	protected abstract get apiKey(): string;

	abstract isConfigured(): boolean;

	/**
	 * Make the actual API call to the AI service
	 * Must be implemented by each provider
	 * @param imageBase64 - Base64 encoded image
	 * @param mimeType - Image MIME type
	 * @param prompt - The extraction prompt to use
	 */
	protected abstract callAPI(imageBase64: string, mimeType: string, prompt: string): Promise<string>;

	/**
	 * Analyze an image and extract product label data
	 */
	async analyze(imageBase64: string, mimeType: string): Promise<AIServiceResult> {
		const startTime = new Date();

		if (!this.isConfigured()) {
			return {
				provider: this.name,
				success: false,
				error: `${this.displayName} API key not configured`,
				startTime,
				endTime: new Date(),
				durationMs: 0
			};
		}

		try {
			// Fetch the active prompt for this provider
			const prompt = await this.getPromptAsync();

			const { result: rawResponse, endTime, durationMs } = await withTiming(() =>
				this.callAPI(imageBase64, mimeType, prompt)
			);

			const cleanedResponse = cleanResponse(rawResponse);
			const extractedData = parseAIResponse(cleanedResponse);

			if (!extractedData) {
				return {
					provider: this.name,
					success: false,
					error: 'Failed to parse JSON response',
					rawResponse,
					startTime,
					endTime,
					durationMs
				};
			}

			if (!validateExtractedData(extractedData)) {
				return {
					provider: this.name,
					success: false,
					error: 'Extracted data missing required fields',
					data: extractedData,
					rawResponse,
					startTime,
					endTime,
					durationMs
				};
			}

			return {
				provider: this.name,
				success: true,
				data: extractedData,
				rawResponse,
				startTime,
				endTime,
				durationMs
			};
		} catch (error) {
			const endTime = new Date();
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			return {
				provider: this.name,
				success: false,
				error: errorMessage,
				startTime,
				endTime,
				durationMs: endTime.getTime() - startTime.getTime()
			};
		}
	}

	/**
	 * Get the extraction prompt for this provider (async - fetches from DB)
	 */
	protected async getPromptAsync(): Promise<string> {
		return getExtractionPromptForProvider(this.name);
	}

	/**
	 * Get the default extraction prompt (sync - for backward compatibility)
	 */
	protected getPrompt(): string {
		return EXTRACTION_PROMPT;
	}
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelayMs = 1000
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Check if it's a rate limit error (429)
			if (lastError.message.includes('429') || lastError.message.toLowerCase().includes('rate limit')) {
				const delay = baseDelayMs * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			// For other errors, don't retry
			throw lastError;
		}
	}

	throw lastError || new Error('Max retries exceeded');
}
