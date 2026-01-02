import type { ExtractedData } from '$lib/pocketbase/types';

/**
 * Safely parse AI response to ExtractedData
 */
export function parseAIResponse(response: string): ExtractedData | null {
	try {
		// Try direct JSON parse
		return JSON.parse(response) as ExtractedData;
	} catch {
		// Try to extract JSON from markdown code blocks
		const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) {
			try {
				return JSON.parse(jsonMatch[1].trim()) as ExtractedData;
			} catch {
				// Continue to next attempt
			}
		}

		// Try to find JSON object in response
		const objectMatch = response.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			try {
				return JSON.parse(objectMatch[0]) as ExtractedData;
			} catch {
				// Failed to parse
			}
		}

		return null;
	}
}

/**
 * Clean up response string by removing common AI prefixes/suffixes
 */
export function cleanResponse(response: string): string {
	return response
		.trim()
		// Remove common AI response prefixes
		.replace(/^(Here is|Here's|The extracted|Based on|I've analyzed)[\s\S]*?:\s*/i, '')
		// Remove trailing explanations
		.replace(/\n\n(Note:|Please note:|I hope|Let me know)[\s\S]*$/i, '')
		.trim();
}

/**
 * Validate that extracted data has minimum required fields
 */
export function validateExtractedData(data: ExtractedData): boolean {
	// Must have at least a product name or some ingredient data
	if (!data.product_name && !data.drug_facts && !data.supplement_facts) {
		return false;
	}

	return true;
}

/**
 * Convert image file to base64 string
 */
export async function imageToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix to get pure base64
			const base64 = result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
	const ext = filename.toLowerCase().split('.').pop();
	const mimeTypes: Record<string, string> = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		bmp: 'image/bmp'
	};
	return mimeTypes[ext || ''] || 'image/jpeg';
}
