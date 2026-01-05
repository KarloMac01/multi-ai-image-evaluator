import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';
import { AIOrchestrator } from '$lib/ai';
import type { AIProvider } from '$lib/pocketbase/types';
import { getDefaultProviders } from '$lib/settings';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const formData = await request.formData();
		const imageFile = formData.get('image') as File | null;
		const providersParam = formData.get('providers') as string | null;

		if (!imageFile) {
			throw error(400, 'No image file provided');
		}

		// Validate file type
		if (!imageFile.type.startsWith('image/')) {
			throw error(415, 'Invalid file type. Please upload an image.');
		}

		// Validate file size (max 10MB)
		if (imageFile.size > 10 * 1024 * 1024) {
			throw error(413, 'File too large. Maximum size is 10MB.');
		}

		// Parse providers if specified, otherwise use defaults from settings
		let providers: AIProvider[];
		if (providersParam) {
			providers = providersParam.split(',').map((p) => p.trim()) as AIProvider[];
		} else {
			providers = getDefaultProviders();
		}

		// Create evaluation record in Pocketbase
		// Pass the original File object directly - Pocketbase handles File objects better than Blobs
		const evaluation = await serverPB.evaluations.create(
			{ status: 'processing', user: locals.user.id },
			imageFile
		);

		// Convert image to base64 for AI services
		const arrayBuffer = await imageFile.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');
		const mimeType = imageFile.type;

		// Run AI analysis in the background
		runAIAnalysis(evaluation.id, base64, mimeType, providers).catch((err) => {
			console.error('AI analysis failed:', err);
		});

		return json({
			success: true,
			evaluation: {
				id: evaluation.id,
				status: evaluation.status,
				created: evaluation.created
			},
			message: 'Evaluation started. Results will be available shortly.'
		});
	} catch (err) {
		console.error('Evaluate endpoint error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while processing your request');
	}
};

/**
 * Run AI analysis in the background
 */
async function runAIAnalysis(
	evaluationId: string,
	imageBase64: string,
	mimeType: string,
	providers?: AIProvider[]
): Promise<void> {
	const startTime = Date.now();

	try {
		// Create orchestrator with specified providers or all configured
		const orchestrator = new AIOrchestrator(providers);
		const configuredServices = orchestrator.getServices();

		if (configuredServices.length === 0) {
			console.warn('No AI services configured');
			await serverPB.evaluations.update(evaluationId, {
				status: 'failed',
				total_duration_ms: Date.now() - startTime
			});
			return;
		}

		// Run all AI services in parallel
		const result = await orchestrator.analyzeParallel(imageBase64, mimeType, evaluationId);

		// Store individual AI results
		for (const aiResult of result.results) {
			try {
				await serverPB.aiResults.create({
					evaluation: evaluationId,
					provider: aiResult.provider,
					status: aiResult.success ? 'completed' : 'failed',
					extracted_data: aiResult.data || undefined,
					formulation: aiResult.formulation || undefined,
					start_time: aiResult.startTime.toISOString(),
					end_time: aiResult.endTime.toISOString(),
					duration_ms: aiResult.durationMs,
					raw_response: aiResult.rawResponse || undefined,
					error_message: aiResult.error || undefined,
					tokens_used: aiResult.tokensUsed || undefined
				});
			} catch (err) {
				console.error(`Failed to save result for ${aiResult.provider}:`, err);
			}
		}

		// Extract product name from first successful result
		let productName: string | undefined;
		const successfulResult = result.results.find((r) => r.success && r.data?.product_name);
		if (successfulResult?.data?.product_name) {
			productName = successfulResult.data.product_name;
		}

		// Update evaluation status
		await serverPB.evaluations.update(evaluationId, {
			status: result.successCount > 0 ? 'completed' : 'failed',
			product_name: productName,
			total_duration_ms: result.totalDurationMs
		});

		console.log(
			`Evaluation ${evaluationId} completed: ${result.successCount}/${result.results.length} successful in ${result.totalDurationMs}ms`
		);
	} catch (err) {
		console.error(`Evaluation ${evaluationId} failed:`, err);

		await serverPB.evaluations.update(evaluationId, {
			status: 'failed',
			total_duration_ms: Date.now() - startTime
		});
	}
}
