import type { ExtractedData, Formulation, AIProvider } from '$lib/pocketbase/types';

// AI Service result from a single provider
export interface AIServiceResult {
	provider: AIProvider;
	success: boolean;
	data?: ExtractedData;
	formulation?: Formulation;
	rawResponse?: string;
	error?: string;
	startTime: Date;
	endTime: Date;
	durationMs: number;
	tokensUsed?: number;
}

// AI Service interface that all providers must implement
export interface AIService {
	readonly name: AIProvider;
	readonly displayName: string;

	/**
	 * Analyze an image and extract product label data
	 * @param imageBase64 - Base64 encoded image data
	 * @param mimeType - Image MIME type (e.g., 'image/jpeg', 'image/png')
	 * @returns Promise with extraction result
	 */
	analyze(imageBase64: string, mimeType: string): Promise<AIServiceResult>;

	/**
	 * Check if the service is properly configured (API key present)
	 */
	isConfigured(): boolean;
}

// Configuration for AI services
export interface AIServiceConfig {
	apiKey: string;
	enabled: boolean;
}

// All AI service configurations
export interface AIServicesConfig {
	gemini: AIServiceConfig;
	groq: AIServiceConfig;
	mistral: AIServiceConfig;
	openai: AIServiceConfig;
	cloudvision: AIServiceConfig;
}

// Orchestrator result with all AI responses
export interface OrchestratorResult {
	evaluationId: string;
	results: AIServiceResult[];
	totalDurationMs: number;
	successCount: number;
	failureCount: number;
}

// Timing information for performance tracking
export interface TimingInfo {
	provider: AIProvider;
	startTime: Date;
	endTime: Date;
	durationMs: number;
}
