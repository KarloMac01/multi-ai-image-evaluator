import { GOOGLE_CLOUD_API_KEY } from '$env/static/private';
import { BaseAIService, withRetry } from './base';
import type { AIProvider } from '$lib/pocketbase/types';

/**
 * Google Cloud Vision API Service
 * Specialized OCR service for text extraction
 * Free tier: 1,000 units/month
 *
 * Note: Cloud Vision is OCR-focused and returns structured text.
 * We use DOCUMENT_TEXT_DETECTION for dense text like product labels.
 */
export class CloudVisionService extends BaseAIService {
	readonly name: AIProvider = 'cloudvision';
	readonly displayName = 'Google Cloud Vision';
	protected readonly apiKey = GOOGLE_CLOUD_API_KEY || '';

	private readonly baseUrl = 'https://vision.googleapis.com/v1/images:annotate';

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	protected async callAPI(imageBase64: string, _mimeType: string, _prompt: string): Promise<string> {
		const requestBody = {
			requests: [
				{
					image: {
						content: imageBase64
					},
					features: [
						{
							type: 'DOCUMENT_TEXT_DETECTION',
							maxResults: 1
						},
						{
							type: 'TEXT_DETECTION',
							maxResults: 50
						}
					]
				}
			]
		};

		const result = await withRetry(async () => {
			const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || `Cloud Vision API error: ${response.status}`);
			}

			const data = await response.json();
			return this.processVisionResponse(data);
		});

		return result;
	}

	/**
	 * Process Cloud Vision response and convert to our ExtractedData format
	 * Since Cloud Vision is OCR-only, we attempt basic parsing of the text
	 */
	private processVisionResponse(response: CloudVisionResponse): string {
		const annotations = response.responses?.[0];

		if (!annotations) {
			throw new Error('No annotations in response');
		}

		// Get full text from document detection (better for dense labels)
		const fullText = annotations.fullTextAnnotation?.text ||
			annotations.textAnnotations?.[0]?.description || '';

		if (!fullText) {
			throw new Error('No text detected in image');
		}

		// Attempt to parse the OCR text into structured format
		const extractedData = this.parseOCRText(fullText);

		return JSON.stringify(extractedData);
	}

	/**
	 * Basic parsing of OCR text to extract common label fields
	 * This is a simplified parser - the generative AI models do this better
	 */
	private parseOCRText(text: string): Record<string, unknown> {
		const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

		// Initialize extracted data
		const data: Record<string, unknown> = {
			product_name: null,
			brand: null,
			formulation_type: null,
			drug_facts: null,
			supplement_facts: null,
			dosage_instructions: null,
			warnings_contraindications: [],
			storage_conditions: null,
			lot_number: null,
			expiration_date: null,
			_raw_ocr_text: text // Include raw text for reference
		};

		// Simple pattern matching for common fields
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lowerLine = line.toLowerCase();

			// Product name is often the first prominent line
			if (i < 3 && !data.product_name && line.length > 3 && line.length < 100) {
				data.product_name = line;
			}

			// Look for Drug Facts
			if (lowerLine.includes('drug facts')) {
				data.drug_facts = this.extractDrugFactsSection(lines, i);
			}

			// Look for Supplement Facts
			if (lowerLine.includes('supplement facts')) {
				data.supplement_facts = this.extractSupplementFactsSection(lines, i);
			}

			// Lot number patterns
			const lotMatch = line.match(/lot[#:\s]*([A-Z0-9]+)/i);
			if (lotMatch) {
				data.lot_number = lotMatch[1];
			}

			// Expiration date patterns
			const expMatch = line.match(/exp(?:ires?|iration)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{4})/i);
			if (expMatch) {
				data.expiration_date = expMatch[1];
			}

			// Warnings
			if (lowerLine.includes('warning') || lowerLine.includes('caution')) {
				(data.warnings_contraindications as string[]).push(line);
			}

			// Dosage/Directions
			if (lowerLine.includes('direction') || lowerLine.includes('dosage') || lowerLine.includes('take ')) {
				data.dosage_instructions = line;
			}

			// Storage
			if (lowerLine.includes('store') || lowerLine.includes('storage')) {
				data.storage_conditions = line;
			}
		}

		return data;
	}

	/**
	 * Extract Drug Facts section from OCR text
	 */
	private extractDrugFactsSection(lines: string[], startIndex: number): Record<string, unknown> {
		const drugFacts: Record<string, unknown> = {
			active_ingredients: [],
			inactive_ingredients: [],
			uses: [],
			warnings: [],
			directions: ''
		};

		let currentSection = '';

		for (let i = startIndex + 1; i < Math.min(startIndex + 50, lines.length); i++) {
			const line = lines[i];
			const lowerLine = line.toLowerCase();

			// Detect section headers
			if (lowerLine.includes('active ingredient')) {
				currentSection = 'active';
			} else if (lowerLine.includes('inactive ingredient')) {
				currentSection = 'inactive';
			} else if (lowerLine.includes('use') || lowerLine.includes('purpose')) {
				currentSection = 'uses';
			} else if (lowerLine.includes('warning')) {
				currentSection = 'warnings';
			} else if (lowerLine.includes('direction')) {
				currentSection = 'directions';
			} else if (lowerLine.includes('other information')) {
				break; // End of Drug Facts typically
			} else {
				// Add content to current section
				if (currentSection === 'active' && line.length > 2) {
					(drugFacts.active_ingredients as unknown[]).push({ name: line });
				} else if (currentSection === 'inactive' && line.length > 2) {
					(drugFacts.inactive_ingredients as string[]).push(line);
				} else if (currentSection === 'uses' && line.length > 2) {
					(drugFacts.uses as string[]).push(line);
				} else if (currentSection === 'warnings' && line.length > 2) {
					(drugFacts.warnings as string[]).push(line);
				} else if (currentSection === 'directions' && line.length > 2) {
					drugFacts.directions = (drugFacts.directions as string) + ' ' + line;
				}
			}
		}

		return drugFacts;
	}

	/**
	 * Extract Supplement Facts section from OCR text
	 */
	private extractSupplementFactsSection(lines: string[], startIndex: number): Record<string, unknown> {
		const supplementFacts: Record<string, unknown> = {
			serving_size: '',
			ingredients: [],
			other_ingredients: []
		};

		for (let i = startIndex + 1; i < Math.min(startIndex + 30, lines.length); i++) {
			const line = lines[i];
			const lowerLine = line.toLowerCase();

			if (lowerLine.includes('serving size')) {
				supplementFacts.serving_size = line.replace(/serving size[:\s]*/i, '');
			} else if (lowerLine.includes('other ingredient')) {
				// Start of other ingredients section
				for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
					if (lines[j].length > 2) {
						(supplementFacts.other_ingredients as string[]).push(lines[j]);
					}
				}
				break;
			} else if (line.match(/\d+\s*(mg|mcg|iu|g|%)/i)) {
				// Line contains ingredient with amount
				(supplementFacts.ingredients as unknown[]).push({
					name: line.split(/\d/)[0].trim(),
					amount: line.match(/(\d+[\d,\.]*)\s*(mg|mcg|iu|g|%)/i)?.[0] || ''
				});
			}
		}

		return supplementFacts;
	}
}

// Type definitions for Cloud Vision API response
interface CloudVisionResponse {
	responses?: Array<{
		textAnnotations?: Array<{
			description?: string;
			boundingPoly?: unknown;
		}>;
		fullTextAnnotation?: {
			text?: string;
			pages?: unknown[];
		};
		error?: {
			message?: string;
		};
	}>;
}

// Export singleton instance
export const cloudVisionService = new CloudVisionService();
