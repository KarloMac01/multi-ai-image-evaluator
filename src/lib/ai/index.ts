import type { AIService, AIServiceResult, OrchestratorResult } from './types';
import type { AIProvider } from '$lib/pocketbase/types';
import { geminiService } from './gemini';
import { groqService } from './groq';
import { claudeService } from './claude';
import { openaiService } from './openai';
import { cloudVisionService } from './cloudvision';

/**
 * All available AI services
 */
export const aiServices: Record<AIProvider, AIService> = {
	gemini: geminiService,
	groq: groqService,
	claude: claudeService,
	openai: openaiService,
	cloudvision: cloudVisionService
};

/**
 * Get list of configured AI services
 */
export function getConfiguredServices(): AIService[] {
	return Object.values(aiServices).filter((service) => service.isConfigured());
}

/**
 * Get list of all AI providers
 */
export function getAllProviders(): AIProvider[] {
	return Object.keys(aiServices) as AIProvider[];
}

/**
 * Get display names for providers
 */
export function getProviderDisplayName(provider: AIProvider): string {
	return aiServices[provider]?.displayName || provider;
}

/**
 * AI Orchestrator - runs multiple AI services in parallel
 */
export class AIOrchestrator {
	private services: AIService[];

	constructor(providers?: AIProvider[]) {
		if (providers) {
			// Use specified providers
			this.services = providers
				.map((p) => aiServices[p])
				.filter((s): s is AIService => s !== undefined);
		} else {
			// Use all configured services
			this.services = getConfiguredServices();
		}
	}

	/**
	 * Get the services that will be used
	 */
	getServices(): AIService[] {
		return this.services;
	}

	/**
	 * Check which services are configured
	 */
	getConfigurationStatus(): Record<AIProvider, boolean> {
		return {
			gemini: geminiService.isConfigured(),
			groq: groqService.isConfigured(),
			claude: claudeService.isConfigured(),
			openai: openaiService.isConfigured(),
			cloudvision: cloudVisionService.isConfigured()
		};
	}

	/**
	 * Run all configured AI services in parallel
	 */
	async analyzeParallel(
		imageBase64: string,
		mimeType: string,
		evaluationId: string
	): Promise<OrchestratorResult> {
		const startTime = Date.now();

		if (this.services.length === 0) {
			return {
				evaluationId,
				results: [],
				totalDurationMs: 0,
				successCount: 0,
				failureCount: 0
			};
		}

		// Run all services in parallel using Promise.allSettled
		const promises = this.services.map((service) =>
			service.analyze(imageBase64, mimeType).catch((error) => ({
				provider: service.name,
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				startTime: new Date(),
				endTime: new Date(),
				durationMs: 0
			}))
		);

		const results = await Promise.all(promises);

		const totalDurationMs = Date.now() - startTime;
		const successCount = results.filter((r) => r.success).length;
		const failureCount = results.filter((r) => !r.success).length;

		return {
			evaluationId,
			results,
			totalDurationMs,
			successCount,
			failureCount
		};
	}

	/**
	 * Run services sequentially (for debugging or rate limit handling)
	 */
	async analyzeSequential(
		imageBase64: string,
		mimeType: string,
		evaluationId: string,
		delayBetweenMs = 0
	): Promise<OrchestratorResult> {
		const startTime = Date.now();
		const results: AIServiceResult[] = [];

		for (const service of this.services) {
			try {
				const result = await service.analyze(imageBase64, mimeType);
				results.push(result);
			} catch (error) {
				results.push({
					provider: service.name,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					startTime: new Date(),
					endTime: new Date(),
					durationMs: 0
				});
			}

			// Optional delay between calls
			if (delayBetweenMs > 0) {
				await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
			}
		}

		const totalDurationMs = Date.now() - startTime;
		const successCount = results.filter((r) => r.success).length;
		const failureCount = results.filter((r) => !r.success).length;

		return {
			evaluationId,
			results,
			totalDurationMs,
			successCount,
			failureCount
		};
	}

	/**
	 * Run a single service
	 */
	async analyzeSingle(
		provider: AIProvider,
		imageBase64: string,
		mimeType: string
	): Promise<AIServiceResult> {
		const service = aiServices[provider];

		if (!service) {
			return {
				provider,
				success: false,
				error: `Unknown provider: ${provider}`,
				startTime: new Date(),
				endTime: new Date(),
				durationMs: 0
			};
		}

		if (!service.isConfigured()) {
			return {
				provider,
				success: false,
				error: `${service.displayName} is not configured`,
				startTime: new Date(),
				endTime: new Date(),
				durationMs: 0
			};
		}

		return service.analyze(imageBase64, mimeType);
	}
}

// Export a default orchestrator instance with all configured services
export const defaultOrchestrator = new AIOrchestrator();

// Re-export types
export type { AIService, AIServiceResult, OrchestratorResult } from './types';

// Re-export individual services for direct access
export { geminiService } from './gemini';
export { groqService } from './groq';
export { claudeService } from './claude';
export { openaiService } from './openai';
export { cloudVisionService } from './cloudvision';
