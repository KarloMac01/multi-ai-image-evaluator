// Pocketbase Collection Types for Multi-AI Image Evaluator

// AI Provider enum
export type AIProvider = 'gemini' | 'groq' | 'mistral' | 'openai' | 'cloudvision';

// Evaluation status
export type EvaluationStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Base record type (common fields from Pocketbase)
export interface BaseRecord {
	id: string;
	created: string;
	updated: string;
}

// Evaluation collection
export interface Evaluation extends BaseRecord {
	image: string;
	product_name?: string;
	status: EvaluationStatus;
	total_duration_ms?: number;
}

// AI Result collection
export interface AIResult extends BaseRecord {
	evaluation: string;
	provider: AIProvider;
	status: EvaluationStatus;
	extracted_data?: ExtractedData;
	formulation?: Formulation;
	start_time: string;
	end_time?: string;
	duration_ms?: number;
	raw_response?: string;
	error_message?: string;
	tokens_used?: number;
}

// Web Result collection
export interface WebResult extends BaseRecord {
	evaluation: string;
	search_query: string;
	source_url?: string;
	source_title?: string;
	formulation_data?: Record<string, unknown>;
	confidence_score?: number;
	snippet?: string;
}

// Extracted data structure from AI analysis
export interface ExtractedData {
	product_name?: string;
	brand?: string;
	manufacturer?: string;
	ndc_code?: string;
	upc_code?: string;
	formulation_type?: FormulationType;
	drug_facts?: DrugFacts;
	supplement_facts?: SupplementFacts;
	dosage_instructions?: string;
	warnings_contraindications?: string[];
	drug_interactions?: string[];
	storage_conditions?: string;
	lot_number?: string;
	expiration_date?: string;
	net_contents?: string;
	country_of_origin?: string;
}

// Formulation types
export type FormulationType =
	| 'tablet'
	| 'capsule'
	| 'softgel'
	| 'liquid'
	| 'powder'
	| 'cream'
	| 'gel'
	| 'ointment'
	| 'patch'
	| 'spray'
	| 'drops'
	| 'injection'
	| 'suppository'
	| 'lozenge'
	| 'gummy';

// Drug Facts panel structure
export interface DrugFacts {
	active_ingredients: ActiveIngredient[];
	inactive_ingredients: string[];
	uses: string[];
	warnings: string[];
	directions: string;
	other_info?: string;
}

// Supplement Facts structure
export interface SupplementFacts {
	serving_size: string;
	servings_per_container?: number;
	ingredients: SupplementIngredient[];
	other_ingredients?: string[];
}

// Active ingredient in Drug Facts
export interface ActiveIngredient {
	name: string;
	amount: string;
	unit: string;
	purpose?: string;
}

// Supplement ingredient
export interface SupplementIngredient {
	name: string;
	amount: string;
	unit: string;
	daily_value_percent?: number | null;
}

// Formulation details
export interface Formulation {
	type: string;
	active_compounds: ActiveCompound[];
	excipients: Excipient[];
	delivery_mechanism?: string;
	release_type?: 'immediate' | 'extended' | 'delayed' | 'sustained' | 'modified';
}

// Active compound in formulation
export interface ActiveCompound {
	name: string;
	cas_number?: string;
	concentration: string;
	function?: string;
}

// Excipient in formulation
export interface Excipient {
	name: string;
	function?:
		| 'binder'
		| 'filler'
		| 'disintegrant'
		| 'lubricant'
		| 'coating'
		| 'colorant'
		| 'preservative'
		| 'sweetener'
		| 'flavoring';
}

// Expanded evaluation with related records
export interface EvaluationWithResults extends Evaluation {
	expand?: {
		ai_results?: AIResult[];
		web_results?: WebResult[];
	};
}

// Create/Update types (without id, created, updated)
export type CreateEvaluation = Omit<Evaluation, keyof BaseRecord>;
export type CreateAIResult = Omit<AIResult, keyof BaseRecord>;
export type CreateWebResult = Omit<WebResult, keyof BaseRecord>;
