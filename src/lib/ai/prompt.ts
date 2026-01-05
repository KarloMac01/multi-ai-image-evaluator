// Standardized extraction prompt for pharmaceutical/supplement product labels
// This prompt can be customized by users in the Settings page

export const DEFAULT_EXTRACTION_PROMPT = `You are an expert pharmaceutical and supplement label analyzer. Analyze the provided product label image and extract all available information into a structured JSON format.

## WHERE TO LOOK ON THE LABEL:

1. **PRODUCT NAME** - Usually the LARGEST, most prominent text on the front of the label
   Examples: "Tylenol Extra Strength", "Nature Made Vitamin D3", "Advil Liqui-Gels"

2. **BRAND NAME** - Often appears above or below the product name, may include a logo
   Look for: Company names like "Johnson & Johnson", "Nature Made", "NOW Foods"
   Location: Top of label, near logo, or bottom near manufacturer info

3. **MANUFACTURER** - Usually at the BOTTOM of the label in smaller text
   Look for: "Manufactured by", "Distributed by", "Made by"
   Format: "Company Name, City, State ZIP"

4. **NDC CODE** - National Drug Code, 10-11 digits for prescription/OTC drugs
   Format: XXXX-XXXX-XX or XXXXX-XXX-XX (with dashes)
   Location: Near barcode, bottom of label, or side panel

5. **UPC/BARCODE** - 12-digit number below the barcode
   Location: Bottom or back of package

6. **DRUG FACTS PANEL** - White rectangular box with specific format
   Header: "Drug Facts" in bold
   Sections in order: Active Ingredient, Uses, Warnings, Directions, Other Information, Inactive Ingredients

7. **SUPPLEMENT FACTS PANEL** - Similar to nutrition facts
   Header: "Supplement Facts"
   Shows: Serving Size, Amount Per Serving, % Daily Value
   Look for: Vitamins (A, B, C, D, E, K), Minerals (Calcium, Iron, Zinc), Herbs

8. **ACTIVE INGREDIENTS** - Listed with amounts and purpose
   Format: "Ingredient Name.....Amount.....Purpose"
   Example: "Acetaminophen 500 mg.....Pain reliever/fever reducer"

9. **DOSAGE/DIRECTIONS** - How to take the product
   Look for: "Adults and children 12 years and over:", "Take X tablets every Y hours"
   Location: Drug Facts panel or separate "Directions" section

10. **WARNINGS** - Safety information, often in red or bold
    Look for: "Warning:", "Do not use if", "Ask a doctor before use if"
    Includes: Pregnancy warnings, allergy info, overdose info

11. **LOT/BATCH NUMBER** - Manufacturing identifier
    Format: "LOT:", "Batch:", "L:" followed by alphanumeric code
    Location: Bottom, side, or crimp of package

12. **EXPIRATION DATE** - Product shelf life
    Format: "EXP:", "Best By:", "Use By:" followed by MM/YY or MM/YYYY
    Location: Near lot number, bottom, or crimp

## FORMULATION TYPE RECOGNITION:

- **Tablet** - Round/oval solid, may say "tablets" on label
- **Capsule** - Two-piece shell, says "capsules"
- **Softgel** - Soft gelatin shell, often translucent
- **Liquid** - Bottle with fl oz/mL measurements
- **Powder** - Loose form, often in canister/pouch
- **Cream/Gel/Ointment** - Tube or jar, topical use
- **Spray** - Pump or aerosol container
- **Drops** - Small bottle with dropper
- **Gummy** - Chewable, often says "gummies"
- **Lozenge** - Dissolving tablet for throat

## REQUIRED JSON OUTPUT:

{
  "product_name": "string - The main product name (largest text)",
  "brand": "string - Brand/company name",
  "manufacturer": "string - Full manufacturer name and location if visible",
  "ndc_code": "string - 10-11 digit NDC code with dashes (XXXX-XXXX-XX)",
  "upc_code": "string - 12-digit UPC barcode number",

  "formulation_type": "tablet|capsule|softgel|liquid|powder|cream|gel|ointment|patch|spray|drops|injection|suppository|lozenge|gummy",

  "drug_facts": {
    "active_ingredients": [
      {
        "name": "string - Ingredient name exactly as shown",
        "amount": "string - e.g., '500 mg', '10 mg/5 mL'",
        "unit": "string - e.g., 'mg', 'mcg', 'mL'",
        "purpose": "string - Therapeutic purpose from label"
      }
    ],
    "inactive_ingredients": ["string array - ALL inactive ingredients listed"],
    "uses": ["string array - ALL uses/indications from 'Uses' section"],
    "warnings": ["string array - ALL warnings, including pregnancy, allergy, etc."],
    "directions": "string - Complete dosage directions exactly as written",
    "other_info": "string - Storage conditions, tamper info, etc."
  },

  "supplement_facts": {
    "serving_size": "string - e.g., '1 tablet', '2 capsules', '1 scoop (30g)'",
    "servings_per_container": "number - Total servings in package",
    "ingredients": [
      {
        "name": "string - Ingredient name (Vitamin D3, Calcium, etc.)",
        "amount": "string - e.g., '1000', '50'",
        "unit": "string - e.g., 'mg', 'mcg', 'IU', 'mg NE'",
        "daily_value_percent": "number or null - The % Daily Value number only"
      }
    ],
    "other_ingredients": ["string array - Non-active ingredients at bottom"]
  },

  "dosage_instructions": "string - Full dosing information",
  "warnings_contraindications": ["string array - When NOT to use this product"],
  "drug_interactions": ["string array - Medications/substances to avoid"],
  "storage_conditions": "string - 'Store at room temperature', 'Keep refrigerated', etc.",
  "lot_number": "string - Lot/batch identifier",
  "expiration_date": "string - Expiration date exactly as shown on label",
  "net_contents": "string - e.g., '100 tablets', '4 fl oz (120 mL)', '60 gummies'",
  "country_of_origin": "string - Manufacturing/distribution country"
}

## CRITICAL RULES:

1. Extract EVERY piece of visible text, even if partially obscured
2. Return ONLY valid JSON - no markdown, no explanations, no code blocks
3. Use null for any field that is not visible or not applicable
4. Preserve exact values as shown (don't convert units or formats)
5. For percentages in daily_value_percent, use the number only (50 not "50%")
6. Include ALL warnings even if lengthy - patient safety is critical
7. If text is unclear, make your best interpretation and include it

Analyze the image now and return the JSON:`;

// Formulation analysis prompt for additional insights
export const DEFAULT_FORMULATION_PROMPT = `Based on the extracted product information, provide detailed pharmaceutical formulation analysis.

## ANALYSIS GUIDELINES:

1. **Active Compounds** - Identify the therapeutic agents
   - Use generic/chemical names when possible
   - Include CAS numbers for common compounds if you know them
   - Note the concentration per dose unit

2. **Excipients** - Identify inactive ingredients by their function:
   - **Binders** - Hold tablet together (microcrystalline cellulose, starch)
   - **Fillers** - Add bulk (lactose, dicalcium phosphate)
   - **Disintegrants** - Help tablet break apart (croscarmellose sodium)
   - **Lubricants** - Prevent sticking (magnesium stearate, stearic acid)
   - **Coatings** - Outer layer (hypromellose, polyethylene glycol)
   - **Colorants** - Add color (FD&C dyes, titanium dioxide)
   - **Preservatives** - Prevent spoilage (sodium benzoate, BHT)
   - **Sweeteners** - Add taste (sucralose, sorbitol)
   - **Flavorings** - Add flavor (natural/artificial flavors)

3. **Release Type** - Determine drug release mechanism:
   - **Immediate** - Standard tablets/capsules
   - **Extended/Sustained** - "ER", "XR", "SR" in name, releases over time
   - **Delayed** - Enteric coating, releases in intestine
   - **Modified** - Special release pattern

## REQUIRED JSON OUTPUT:

{
  "type": "string - immediate release, extended release, enteric coated, sublingual, etc.",
  "active_compounds": [
    {
      "name": "string - Generic/chemical name",
      "cas_number": "string or null - CAS registry number if known",
      "concentration": "string - Amount per dose (e.g., '500 mg per tablet')",
      "function": "string - Primary therapeutic function"
    }
  ],
  "excipients": [
    {
      "name": "string - Excipient name",
      "function": "binder|filler|disintegrant|lubricant|coating|colorant|preservative|sweetener|flavoring"
    }
  ],
  "delivery_mechanism": "string - oral, sublingual, topical, transdermal, nasal, ophthalmic, etc.",
  "release_type": "immediate|extended|delayed|sustained|modified"
}

Return ONLY valid JSON, no additional text or markdown.`;

import { serverPB } from '$lib/pocketbase/server';
import type { AIProvider, PromptType } from '$lib/pocketbase/types';

// Cache for active prompts to avoid repeated DB calls within a request
let promptCache: Map<string, { content: string; timestamp: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get the active prompt for a specific provider and type
 * Falls back to default if no active prompt is set
 */
export async function getActivePromptForProvider(
	provider: AIProvider,
	promptType: PromptType
): Promise<string> {
	const cacheKey = `${provider}:${promptType}`;
	const cached = promptCache.get(cacheKey);

	// Return cached if still valid
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.content;
	}

	try {
		const activePrompt = await serverPB.prompts.getActivePrompt(provider, promptType);

		if (activePrompt) {
			promptCache.set(cacheKey, { content: activePrompt.content, timestamp: Date.now() });
			return activePrompt.content;
		}
	} catch (err) {
		console.error(`Failed to fetch active prompt for ${provider}/${promptType}:`, err);
	}

	// Fallback to default
	const defaultPrompt = promptType === 'extraction' ? DEFAULT_EXTRACTION_PROMPT : DEFAULT_FORMULATION_PROMPT;
	promptCache.set(cacheKey, { content: defaultPrompt, timestamp: Date.now() });
	return defaultPrompt;
}

/**
 * Get the extraction prompt for a provider (async)
 */
export async function getExtractionPromptForProvider(provider: AIProvider): Promise<string> {
	return getActivePromptForProvider(provider, 'extraction');
}

/**
 * Get the formulation prompt for a provider (async)
 */
export async function getFormulationPromptForProvider(provider: AIProvider): Promise<string> {
	return getActivePromptForProvider(provider, 'formulation');
}

/**
 * Clear the prompt cache (useful after saving new prompts)
 */
export function clearPromptCache(): void {
	promptCache.clear();
}

// For backward compatibility - these return the default prompts synchronously
export const EXTRACTION_PROMPT = DEFAULT_EXTRACTION_PROMPT;
export const FORMULATION_PROMPT = DEFAULT_FORMULATION_PROMPT;
