import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverPB } from '$lib/pocketbase/server';
import { AIOrchestrator } from '$lib/ai';
import type { AIProvider } from '$lib/pocketbase/types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { id } = params;

	if (!id) {
		throw error(400, 'Evaluation ID is required');
	}

	try {
		// Get the evaluation
		const evaluation = await serverPB.evaluations.getOne(id);

		if (!evaluation.image) {
			throw error(400, 'Evaluation has no image to re-evaluate');
		}

		// Parse request body for optional provider filter
		let providers: AIProvider[] | undefined;
		try {
			const body = await request.json();
			if (body.providers && Array.isArray(body.providers)) {
				providers = body.providers as AIProvider[];
			}
		} catch {
			// No body or invalid JSON, evaluate all providers
		}

		// Get the image from Pocketbase storage
		const imageUrl = serverPB.evaluations.getImageUrl(evaluation);
		const imageResponse = await fetch(imageUrl);

		if (!imageResponse.ok) {
			throw error(500, 'Failed to fetch evaluation image');
		}

		const imageBuffer = await imageResponse.arrayBuffer();
		const base64 = Buffer.from(imageBuffer).toString('base64');
		const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

		// Update evaluation status to processing
		await serverPB.evaluations.update(id, { status: 'processing' });

		// Run AI analysis in the background
		runReEvaluation(id, base64, mimeType, providers).catch((err) => {
			console.error('Re-evaluation failed:', err);
		});

		return json({
			success: true,
			message: providers
				? `Re-evaluating with ${providers.length} provider(s)`
				: 'Re-evaluating with all providers',
			providers: providers || 'all'
		});
	} catch (err) {
		console.error(`Re-evaluation ${id} error:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while starting re-evaluation');
	}
};

/**
 * Run AI re-evaluation in the background
 */
async function runReEvaluation(
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
			console.warn('No AI services configured for re-evaluation');
			await serverPB.evaluations.update(evaluationId, {
				status: 'failed',
				total_duration_ms: Date.now() - startTime
			});
			return;
		}

		// Delete existing AI results for the providers being re-evaluated
		const existingResults = await serverPB.aiResults.getByEvaluation(evaluationId);
		for (const result of existingResults) {
			// If specific providers requested, only delete those
			if (!providers || providers.includes(result.provider)) {
				try {
					const pb = (await import('$lib/pocketbase/server')).getServerPB();
					await pb.collection('ai_results').delete(result.id);
				} catch (err) {
					console.error(`Failed to delete old result for ${result.provider}:`, err);
				}
			}
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
			`Re-evaluation ${evaluationId} completed: ${result.successCount}/${result.results.length} successful in ${result.totalDurationMs}ms`
		);
	} catch (err) {
		console.error(`Re-evaluation ${evaluationId} failed:`, err);

		await serverPB.evaluations.update(evaluationId, {
			status: 'failed',
			total_duration_ms: Date.now() - startTime
		});
	}
}
