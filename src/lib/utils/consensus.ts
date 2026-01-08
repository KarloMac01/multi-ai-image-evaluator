// Consensus calculation utilities for comparing AI provider outputs

import type { AIProvider, AIResult, ExtractedData } from '$lib/pocketbase/types';

export interface FieldConsensus {
	field: string;
	consensusValue: unknown;
	agreementCount: number;
	totalProviders: number;
	agreementRate: number;
	providerValues: Partial<Record<AIProvider, unknown>>;
	hasConsensus: boolean; // true if >= 3/5 (60%) agree
}

export interface EvaluationConsensus {
	evaluationId: string;
	totalFields: number;
	fieldsWithConsensus: number;
	consensusRate: number;
	fieldResults: FieldConsensus[];
}

export interface ProviderAccuracy {
	provider: AIProvider;
	totalFields: number;
	matchedConsensus: number;
	accuracy: number;
}

// Normalize value for comparison
export function normalizeValue(value: unknown): string {
	if (value === null || value === undefined) return '__EMPTY__';
	if (typeof value === 'string') {
		const trimmed = value.toLowerCase().trim();
		return trimmed === '' ? '__EMPTY__' : trimmed;
	}
	if (typeof value === 'number') return String(value);
	if (typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return '__EMPTY__';
		return JSON.stringify(value.map((v) => normalizeValue(v)).sort());
	}
	if (typeof value === 'object') {
		const keys = Object.keys(value as object);
		if (keys.length === 0) return '__EMPTY__';
		return JSON.stringify(value);
	}
	return String(value);
}

// Get nested value from object using dot notation
export function getNestedValue(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== 'object') return undefined;

	const parts = path.split('.');
	let current: unknown = obj;

	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}

	return current;
}

// Calculate consensus for a single field across all providers
export function calculateFieldConsensus(
	aiResults: AIResult[],
	fieldPath: string
): FieldConsensus {
	const completedResults = aiResults.filter((r) => r.status === 'completed');
	const providerValues: Partial<Record<AIProvider, unknown>> = {};
	const normalizedGroups: Map<string, { value: unknown; providers: AIProvider[] }> = new Map();

	for (const result of completedResults) {
		const value = getNestedValue(result.extracted_data, fieldPath);
		providerValues[result.provider] = value;

		const normalized = normalizeValue(value);

		if (!normalizedGroups.has(normalized)) {
			normalizedGroups.set(normalized, { value, providers: [] });
		}
		normalizedGroups.get(normalized)!.providers.push(result.provider);
	}

	// Find the majority group
	let maxCount = 0;
	let consensusValue: unknown = null;

	for (const [, group] of normalizedGroups) {
		if (group.providers.length > maxCount) {
			maxCount = group.providers.length;
			consensusValue = group.value;
		}
	}

	const totalProviders = completedResults.length;
	const agreementRate = totalProviders > 0 ? (maxCount / totalProviders) * 100 : 0;

	return {
		field: fieldPath,
		consensusValue,
		agreementCount: maxCount,
		totalProviders,
		agreementRate,
		providerValues,
		hasConsensus: maxCount >= 3 // At least 3 out of 5 providers agree
	};
}

// Fields to check for consensus (top-level and nested)
export const CONSENSUS_FIELDS = [
	// Top-level fields
	'product_name',
	'brand',
	'manufacturer',
	'formulation_type',
	'ndc_code',
	'upc_code',
	'lot_number',
	'expiration_date',
	'net_contents',
	'dosage_instructions',
	'storage_conditions',
	// Cannabis info fields
	'cannabis_info.thc_content',
	'cannabis_info.cbd_content',
	'cannabis_info.strain_name',
	'cannabis_info.product_type',
	// Drug facts fields
	'drug_facts.directions',
	// Supplement facts fields
	'supplement_facts.serving_size',
	'supplement_facts.servings_per_container'
];

// Calculate consensus for an entire evaluation
export function calculateEvaluationConsensus(
	evaluationId: string,
	aiResults: AIResult[]
): EvaluationConsensus {
	const fieldResults: FieldConsensus[] = [];

	for (const field of CONSENSUS_FIELDS) {
		const consensus = calculateFieldConsensus(aiResults, field);
		// Only include fields where at least one provider has a value
		if (consensus.agreementCount > 0 || normalizeValue(consensus.consensusValue) !== '__EMPTY__') {
			fieldResults.push(consensus);
		}
	}

	const fieldsWithConsensus = fieldResults.filter((f) => f.hasConsensus).length;
	const totalFields = fieldResults.length;
	const consensusRate = totalFields > 0 ? (fieldsWithConsensus / totalFields) * 100 : 0;

	return {
		evaluationId,
		totalFields,
		fieldsWithConsensus,
		consensusRate,
		fieldResults
	};
}

// Calculate accuracy of a provider against consensus across multiple evaluations
export function calculateProviderAccuracy(
	provider: AIProvider,
	evaluationConsensuses: EvaluationConsensus[]
): ProviderAccuracy {
	let totalFields = 0;
	let matchedConsensus = 0;

	for (const evalConsensus of evaluationConsensuses) {
		for (const field of evalConsensus.fieldResults) {
			if (field.hasConsensus && field.providerValues[provider] !== undefined) {
				totalFields++;
				const providerNormalized = normalizeValue(field.providerValues[provider]);
				const consensusNormalized = normalizeValue(field.consensusValue);
				if (providerNormalized === consensusNormalized) {
					matchedConsensus++;
				}
			}
		}
	}

	return {
		provider,
		totalFields,
		matchedConsensus,
		accuracy: totalFields > 0 ? (matchedConsensus / totalFields) * 100 : 0
	};
}

// Calculate consensus distribution across evaluations
export interface ConsensusDistribution {
	full: number; // 5/5 agree
	strong: number; // 4/5 agree
	majority: number; // 3/5 agree
	split: number; // no majority (< 3/5)
	total: number;
}

export function calculateConsensusDistribution(
	evaluationConsensuses: EvaluationConsensus[]
): ConsensusDistribution {
	const distribution: ConsensusDistribution = {
		full: 0,
		strong: 0,
		majority: 0,
		split: 0,
		total: 0
	};

	for (const evalConsensus of evaluationConsensuses) {
		for (const field of evalConsensus.fieldResults) {
			distribution.total++;
			if (field.agreementCount >= 5) {
				distribution.full++;
			} else if (field.agreementCount >= 4) {
				distribution.strong++;
			} else if (field.agreementCount >= 3) {
				distribution.majority++;
			} else {
				distribution.split++;
			}
		}
	}

	return distribution;
}
