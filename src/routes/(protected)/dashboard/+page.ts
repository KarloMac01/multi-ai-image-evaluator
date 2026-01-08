import type { PageLoad } from './$types';

export interface DashboardData {
	summary: {
		totalEvaluations: number;
		completedEvaluations: number;
		averageProcessingTimeMs: number;
		overallConsensusRate: number;
	};
	providerStats: Array<{
		provider: string;
		totalEvaluations: number;
		successful: number;
		failed: number;
		successRate: number;
		avgDurationMs: number;
		consensusAccuracy: number;
	}>;
	fieldRecognition: Array<{
		field: string;
		category: string;
		byProvider: Record<string, number>;
	}>;
	trends: Array<{
		date: string;
		evaluationCount: number;
		successRate: number;
		avgDurationMs: number;
	}>;
	consensusDistribution: {
		full: number;
		strong: number;
		majority: number;
		split: number;
	};
}

export const load: PageLoad = async ({ fetch, url, depends }) => {
	depends('app:dashboard');

	const days = url.searchParams.get('days') || '30';

	try {
		const response = await fetch(`/api/dashboard?days=${days}`);

		if (!response.ok) {
			throw new Error('Failed to fetch dashboard data');
		}

		const data: DashboardData = await response.json();

		return {
			dashboard: data,
			days: parseInt(days, 10),
			error: null
		};
	} catch (error) {
		console.error('Dashboard load error:', error);
		return {
			dashboard: null,
			days: parseInt(days, 10),
			error: error instanceof Error ? error.message : 'Failed to load dashboard'
		};
	}
};
