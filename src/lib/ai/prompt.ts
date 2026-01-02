// Standardized extraction prompt for pharmaceutical/supplement product labels

export const EXTRACTION_PROMPT = `You are an expert pharmaceutical and supplement label analyzer. Analyze the provided product label image and extract all available information into a structured JSON format.

## Instructions:
1. Extract ALL visible text from the label
2. Parse and structure the information according to the schema below
3. For Drug Facts labels, capture the complete panel
4. For Supplement Facts labels, capture all nutritional information
5. If a field is not visible or not applicable, use null
6. Preserve exact values as shown (don't convert units)
7. Include lot numbers, expiration dates, and barcodes if visible

## Required JSON Output Schema:

{
  "product_name": "string - Main product name",
  "brand": "string - Brand name",
  "manufacturer": "string - Manufacturing company",
  "ndc_code": "string - National Drug Code if present",
  "upc_code": "string - UPC barcode number if visible",

  "formulation_type": "tablet|capsule|softgel|liquid|powder|cream|gel|ointment|patch|spray|drops|injection|suppository|lozenge|gummy",

  "drug_facts": {
    "active_ingredients": [
      {
        "name": "string",
        "amount": "string - e.g., '500 mg'",
        "unit": "string - e.g., 'mg', 'mcg', '%'",
        "purpose": "string - therapeutic purpose"
      }
    ],
    "inactive_ingredients": ["string array - list all inactive ingredients"],
    "uses": ["string array - all listed uses/indications"],
    "warnings": ["string array - all warnings including pregnancy, allergy, etc."],
    "directions": "string - complete dosage directions",
    "other_info": "string - storage, tamper evident info, etc."
  },

  "supplement_facts": {
    "serving_size": "string - e.g., '1 tablet', '2 capsules'",
    "servings_per_container": "number",
    "ingredients": [
      {
        "name": "string - ingredient name",
        "amount": "string - e.g., '1000'",
        "unit": "string - e.g., 'mg', 'mcg', 'IU'",
        "daily_value_percent": "number or null - % Daily Value"
      }
    ],
    "other_ingredients": ["string array - non-active ingredients"]
  },

  "dosage_instructions": "string - complete dosing information",
  "warnings_contraindications": ["string array - when not to use"],
  "drug_interactions": ["string array - medications to avoid"],
  "storage_conditions": "string - storage requirements",
  "lot_number": "string - lot/batch number",
  "expiration_date": "string - expiration date as shown",
  "net_contents": "string - quantity, e.g., '100 tablets', '4 fl oz'",
  "country_of_origin": "string - where manufactured/distributed"
}

## Important Notes:
- Return ONLY valid JSON, no additional text or markdown
- Use American English spelling
- Preserve brand-specific terminology
- Include ALL visible warnings, even if lengthy
- For percentages, use the number only (e.g., 50 not "50%")

Analyze the image and return the JSON:`;

// Formulation analysis prompt for additional insights
export const FORMULATION_PROMPT = `Based on the extracted product information, identify the pharmaceutical/supplement formulation details.

Return a JSON object with this structure:

{
  "type": "string - immediate release, extended release, enteric coated, etc.",
  "active_compounds": [
    {
      "name": "string - chemical/generic name",
      "cas_number": "string - CAS registry number if known",
      "concentration": "string - amount per dose",
      "function": "string - therapeutic function"
    }
  ],
  "excipients": [
    {
      "name": "string - excipient name",
      "function": "binder|filler|disintegrant|lubricant|coating|colorant|preservative|sweetener|flavoring"
    }
  ],
  "delivery_mechanism": "string - oral, sublingual, topical, etc.",
  "release_type": "immediate|extended|delayed|sustained|modified"
}

Return ONLY valid JSON, no additional text.`;
