import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerPB } from '$lib/pocketbase/server';
import { COLLECTIONS } from '$lib/pocketbase/client';
import type { AIProvider, AIResult, Evaluation } from '$lib/pocketbase/types';
import {
	calculateEvaluationConsensus,
	calculateProviderAccuracy,
	calculateConsensusDistribution,
	type EvaluationConsensus
} from '$lib/utils/consensus';

// Dashboard response types
interface ProviderStats {
	provider: AIProvider;
	totalEvaluations: number;
	successful: number;
	failed: number;
	successRate: number;
	avgDurationMs: number;
	consensusAccuracy: number;
}

interface FieldRecognitionRow {
	field: string;
	category: 'top-level' | 'cannabis' | 'drug' | 'supplement';
	byProvider: Partial<Record<AIProvider, number>>;
}

interface DailyTrend {
	date: string;
	evaluationCount: number;
	successRate: number;
	avgDurationMs: number;
}

interface DashboardSummary {
	totalEvaluations: number;
	completedEvaluations: number;
	averageProcessingTimeMs: number;
	overallConsensusRate: number;
}

interface ConsensusDistributionData {
	full: number;
	strong: number;
	majority: number;
	split: number;
}

interface DashboardResponse {
	summary: DashboardSummary;
	providerStats: ProviderStats[];
	fieldRecognition: FieldRecognitionRow[];
	trends: DailyTrend[];
	consensusDistribution: ConsensusDistributionData;
}

// PocketBase view types
interface VProviderStats {
	id: string;
	provider: AIProvider;
	total_evaluations: number;
	successful: number;
	failed: number;
	success_rate: number;
	avg_duration_ms: number;
	first_evaluation: string;
	last_evaluation: string;
}

interface VDailyTrends {
	id: string;
	eval_date: string;
	evaluation_count: number;
	total_ai_results: number;
	successful_results: number;
	success_rate: number;
	avg_duration_ms: number;
}

interface VFieldRecognition {
	id: string;
	provider: AIProvider;
	total_completed: number;
	has_product_name: number;
	has_brand: number;
	has_manufacturer: number;
	has_formulation_type: number;
	has_cannabis_info: number;
	has_cannabis_facts: number;
	has_drug_facts: number;
	has_supplement_facts: number;
}

interface VEvaluationSummary {
	id: string;
	product_name: string;
	eval_status: string;
	total_duration_ms: number;
	created: string;
	provider_count: number;
	providers_completed: number;
	providers_failed: number;
	successful_providers: string;
}

const ALL_PROVIDERS: AIProvider[] = ['gemini', 'groq', 'claude', 'openai', 'cloudvision'];

// Fields to track for recognition (used in fallback mode)
const TRACKED_FIELDS: { field: string; category: FieldRecognitionRow['category'] }[] = [
	{ field: 'product_name', category: 'top-level' },
	{ field: 'brand', category: 'top-level' },
	{ field: 'manufacturer', category: 'top-level' },
	{ field: 'formulation_type', category: 'top-level' },
	{ field: 'ndc_code', category: 'top-level' },
	{ field: 'net_contents', category: 'top-level' },
	{ field: 'cannabis_info', category: 'cannabis' },
	{ field: 'cannabis_facts', category: 'cannabis' },
	{ field: 'drug_facts', category: 'drug' },
	{ field: 'supplement_facts', category: 'supplement' }
];

// Field mapping from view columns to tracked fields
const VIEW_FIELD_MAP: Record<string, { field: string; category: FieldRecognitionRow['category'] }> =
	{
		has_product_name: { field: 'product_name', category: 'top-level' },
		has_brand: { field: 'brand', category: 'top-level' },
		has_manufacturer: { field: 'manufacturer', category: 'top-level' },
		has_formulation_type: { field: 'formulation_type', category: 'top-level' },
		has_cannabis_info: { field: 'cannabis_info', category: 'cannabis' },
		has_cannabis_facts: { field: 'cannabis_facts', category: 'cannabis' },
		has_drug_facts: { field: 'drug_facts', category: 'drug' },
		has_supplement_facts: { field: 'supplement_facts', category: 'supplement' }
	};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const pb = getServerPB();
		const days = parseInt(url.searchParams.get('days') || '30', 10);

		// Try to use PocketBase views first, fall back to direct queries if views don't exist
		let useViews = true;
		let vProviderStats: VProviderStats[] = [];
		let vDailyTrends: VDailyTrends[] = [];
		let vFieldRecognition: VFieldRecognition[] = [];
		let vEvaluationSummary: VEvaluationSummary[] = [];

		try {
			// Attempt to query views
			[vProviderStats, vDailyTrends, vFieldRecognition, vEvaluationSummary] = await Promise.all([
				pb.collection('v_provider_stats').getFullList<VProviderStats>(),
				pb.collection('v_daily_trends').getFullList<VDailyTrends>({ sort: '-eval_date' }),
				pb.collection('v_field_recognition').getFullList<VFieldRecognition>(),
				pb.collection('v_evaluation_summary').getFullList<VEvaluationSummary>()
			]);
			console.log('Dashboard: Using PocketBase views');
		} catch {
			useViews = false;
			console.log('Dashboard: Views not available, using fallback calculations');
		}

		// We always need AI results for consensus calculation
		const aiResults = await pb.collection(COLLECTIONS.AI_RESULTS).getFullList<AIResult>();

		// Group AI results by evaluation for consensus
		const resultsByEvaluation = new Map<string, AIResult[]>();
		for (const result of aiResults) {
			if (!resultsByEvaluation.has(result.evaluation)) {
				resultsByEvaluation.set(result.evaluation, []);
			}
			resultsByEvaluation.get(result.evaluation)!.push(result);
		}

		// Calculate consensus for each evaluation (needed regardless of views)
		const evaluationConsensuses: EvaluationConsensus[] = [];
		const completedEvaluationIds = useViews
			? vEvaluationSummary.filter((e) => e.eval_status === 'completed').map((e) => e.id)
			: [];

		if (useViews) {
			for (const evalId of completedEvaluationIds) {
				const evalResults = resultsByEvaluation.get(evalId) || [];
				if (evalResults.length > 0) {
					evaluationConsensuses.push(calculateEvaluationConsensus(evalId, evalResults));
				}
			}
		} else {
			// Fallback: fetch evaluations directly
			const evaluations = await pb
				.collection(COLLECTIONS.EVALUATIONS)
				.getFullList<Evaluation>({ sort: '-created' });

			for (const evaluation of evaluations.filter((e) => e.status === 'completed')) {
				const evalResults = resultsByEvaluation.get(evaluation.id) || [];
				if (evalResults.length > 0) {
					evaluationConsensuses.push(calculateEvaluationConsensus(evaluation.id, evalResults));
				}
			}
		}

		// Calculate overall consensus rate
		const overallConsensusRate =
			evaluationConsensuses.length > 0
				? evaluationConsensuses.reduce((sum, ec) => sum + ec.consensusRate, 0) /
					evaluationConsensuses.length
				: 0;

		let summary: DashboardSummary;
		let providerStats: ProviderStats[];
		let fieldRecognition: FieldRecognitionRow[];
		let trends: DailyTrend[];

		if (useViews) {
			// Use view data for summary
			const totalEvaluations = vEvaluationSummary.length;
			const completedEvaluations = vEvaluationSummary.filter(
				(e) => e.eval_status === 'completed'
			).length;
			const avgProcessingTime =
				completedEvaluations > 0
					? vEvaluationSummary
							.filter((e) => e.eval_status === 'completed')
							.reduce((sum, e) => sum + (e.total_duration_ms || 0), 0) / completedEvaluations
					: 0;

			summary = {
				totalEvaluations,
				completedEvaluations,
				averageProcessingTimeMs: Math.round(avgProcessingTime),
				overallConsensusRate: Math.round(overallConsensusRate * 10) / 10
			};

			// Use view data for provider stats
			providerStats = ALL_PROVIDERS.map((provider) => {
				const viewData = vProviderStats.find((v) => v.provider === provider);
				const accuracy = calculateProviderAccuracy(provider, evaluationConsensuses);

				if (viewData) {
					return {
						provider,
						totalEvaluations: viewData.total_evaluations,
						successful: viewData.successful,
						failed: viewData.failed,
						successRate: viewData.success_rate,
						avgDurationMs: Math.round(viewData.avg_duration_ms || 0),
						consensusAccuracy: Math.round(accuracy.accuracy * 10) / 10
					};
				}

				return {
					provider,
					totalEvaluations: 0,
					successful: 0,
					failed: 0,
					successRate: 0,
					avgDurationMs: 0,
					consensusAccuracy: 0
				};
			});

			// Use view data for field recognition
			const fieldMap = new Map<string, FieldRecognitionRow>();
			for (const [viewCol, fieldInfo] of Object.entries(VIEW_FIELD_MAP)) {
				fieldMap.set(fieldInfo.field, {
					field: fieldInfo.field,
					category: fieldInfo.category,
					byProvider: {}
				});
			}

			for (const vfr of vFieldRecognition) {
				const total = vfr.total_completed;
				if (total === 0) continue;

				for (const [viewCol, fieldInfo] of Object.entries(VIEW_FIELD_MAP)) {
					const row = fieldMap.get(fieldInfo.field)!;
					const count = vfr[viewCol as keyof VFieldRecognition] as number;
					row.byProvider[vfr.provider] = Math.round((count / total) * 100);
				}
			}

			fieldRecognition = Array.from(fieldMap.values());

			// Use view data for trends (filter by days)
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - days);

			trends = vDailyTrends
				.filter((t) => new Date(t.eval_date) >= cutoffDate)
				.map((t) => ({
					date: t.eval_date,
					evaluationCount: t.total_ai_results,
					successRate: t.success_rate || 0,
					avgDurationMs: Math.round(t.avg_duration_ms || 0)
				}))
				.sort((a, b) => a.date.localeCompare(b.date));
		} else {
			// Fallback: calculate everything from raw data
			const evaluations = await pb
				.collection(COLLECTIONS.EVALUATIONS)
				.getFullList<Evaluation>({ sort: '-created' });

			const completedEvaluations = evaluations.filter((e) => e.status === 'completed');
			const avgProcessingTime =
				completedEvaluations.length > 0
					? completedEvaluations.reduce((sum, e) => sum + (e.total_duration_ms || 0), 0) /
						completedEvaluations.length
					: 0;

			summary = {
				totalEvaluations: evaluations.length,
				completedEvaluations: completedEvaluations.length,
				averageProcessingTimeMs: Math.round(avgProcessingTime),
				overallConsensusRate: Math.round(overallConsensusRate * 10) / 10
			};

			providerStats = ALL_PROVIDERS.map((provider) => {
				const providerResults = aiResults.filter((r) => r.provider === provider);
				const successful = providerResults.filter((r) => r.status === 'completed');
				const failed = providerResults.filter((r) => r.status === 'failed');
				const avgDuration =
					successful.length > 0
						? successful.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / successful.length
						: 0;

				const accuracy = calculateProviderAccuracy(provider, evaluationConsensuses);

				return {
					provider,
					totalEvaluations: providerResults.length,
					successful: successful.length,
					failed: failed.length,
					successRate:
						providerResults.length > 0 ? (successful.length / providerResults.length) * 100 : 0,
					avgDurationMs: Math.round(avgDuration),
					consensusAccuracy: Math.round(accuracy.accuracy * 10) / 10
				};
			});

			fieldRecognition = TRACKED_FIELDS.map(({ field, category }) => {
				const byProvider: Partial<Record<AIProvider, number>> = {};

				for (const provider of ALL_PROVIDERS) {
					const providerResults = aiResults.filter(
						(r) => r.provider === provider && r.status === 'completed' && r.extracted_data
					);
					const total = providerResults.length;
					if (total === 0) {
						byProvider[provider] = 0;
						continue;
					}

					const hasField = providerResults.filter((r) => {
						const data = r.extracted_data;
						if (!data) return false;
						const value = data[field as keyof typeof data];
						if (value === null || value === undefined) return false;
						if (typeof value === 'string' && value.trim() === '') return false;
						if (typeof value === 'object' && Object.keys(value).length === 0) return false;
						return true;
					}).length;

					byProvider[provider] = Math.round((hasField / total) * 100);
				}

				return { field, category, byProvider };
			});

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - days);

			const dailyMap = new Map<
				string,
				{ count: number; successful: number; totalDuration: number }
			>();

			for (const result of aiResults) {
				const date = new Date(result.created).toISOString().split('T')[0];
				if (new Date(result.created) < cutoffDate) continue;

				if (!dailyMap.has(date)) {
					dailyMap.set(date, { count: 0, successful: 0, totalDuration: 0 });
				}
				const day = dailyMap.get(date)!;
				day.count++;
				if (result.status === 'completed') {
					day.successful++;
					day.totalDuration += result.duration_ms || 0;
				}
			}

			trends = Array.from(dailyMap.entries())
				.map(([date, data]) => ({
					date,
					evaluationCount: data.count,
					successRate: data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0,
					avgDurationMs: data.successful > 0 ? Math.round(data.totalDuration / data.successful) : 0
				}))
				.sort((a, b) => a.date.localeCompare(b.date));
		}

		// Calculate consensus distribution
		const distribution = calculateConsensusDistribution(evaluationConsensuses);

		const response: DashboardResponse = {
			summary,
			providerStats,
			fieldRecognition,
			trends,
			consensusDistribution: {
				full: distribution.full,
				strong: distribution.strong,
				majority: distribution.majority,
				split: distribution.split
			}
		};

		return json(response);
	} catch (error) {
		console.error('Dashboard API error:', error);
		return json(
			{ error: 'Failed to fetch dashboard data', message: String(error) },
			{ status: 500 }
		);
	}
};
