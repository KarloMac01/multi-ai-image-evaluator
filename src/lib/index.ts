// Re-export Pocketbase utilities (client-side only)
export { pb, getClientPB, createPocketBase, COLLECTIONS } from './pocketbase/client';
// Note: serverPB and getServerPB are in ./pocketbase/server for server-side imports only

// Re-export types
export type {
	Evaluation,
	AIResult,
	WebResult,
	ExtractedData,
	Formulation,
	AIProvider,
	EvaluationStatus,
	DrugFacts,
	SupplementFacts,
	ActiveIngredient,
	SupplementIngredient,
	FormulationType,
	CreateEvaluation,
	CreateAIResult,
	CreateWebResult,
	EvaluationWithResults
} from './pocketbase/types';

// Re-export AI types
export type {
	AIServiceResult,
	AIService,
	AIServiceConfig,
	AIServicesConfig,
	OrchestratorResult,
	TimingInfo
} from './ai/types';

// Re-export prompts
export { EXTRACTION_PROMPT, FORMULATION_PROMPT } from './ai/prompt';
