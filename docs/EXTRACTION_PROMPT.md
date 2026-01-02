# AI Extraction Prompt Strategy

## Overview

All AI providers receive the same standardized prompt to ensure consistent extraction across services. The prompt is optimized for pharmaceutical and supplement product labels.

---

## Main Extraction Prompt

```
You are an expert pharmaceutical and supplement label analyzer. Analyze the provided product label image and extract all available information into a structured JSON format.

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
- Return ONLY valid JSON, no additional text
- Use American English spelling
- Preserve brand-specific terminology
- Include ALL visible warnings, even if lengthy
- For percentages, use the number only (e.g., 50 not "50%")

Analyze the image and return the JSON:
```

---

## Provider-Specific Adjustments

### Google Gemini
```typescript
// Gemini works well with the standard prompt
// Add response mime type for reliable JSON
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
  generationConfig: {
    responseMimeType: 'application/json'
  }
});
```

### Groq (Llama 4)
```typescript
// Groq supports JSON mode for structured output
const response = await groq.chat.completions.create({
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64Image } },
        { type: 'text', text: prompt }
      ]
    }
  ],
  response_format: { type: 'json_object' }
});
```

### Mistral (Pixtral)
```typescript
// Mistral handles document-style images well
// Standard prompt works, may need to emphasize table extraction
const response = await mistral.chat.complete({
  model: 'pixtral-12b-2409',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image_url', imageUrl: base64Image },
        { type: 'text', text: prompt }
      ]
    }
  ]
});
```

### OpenAI (GPT-4o)
```typescript
// OpenAI has excellent instruction following
// Can use JSON mode
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64Image } },
        { type: 'text', text: prompt }
      ]
    }
  ],
  response_format: { type: 'json_object' }
});
```

### Google Cloud Vision
```typescript
// Cloud Vision is OCR-focused, requires post-processing
// Use DOCUMENT_TEXT_DETECTION for dense text
const [result] = await client.documentTextDetection(imageBuffer);
const fullText = result.fullTextAnnotation?.text;

// Then use another AI to structure the OCR text, or
// implement custom parsing for Drug Facts / Supplement Facts format
```

---

## Formulation-Specific Extraction

For web search and formulation analysis, use this additional prompt:

```
Based on the extracted product information, identify the pharmaceutical/supplement formulation details:

{
  "formulation": {
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
}

Analyze these ingredients and categorize them:
[Insert extracted ingredients here]
```

---

## Response Parsing

```typescript
// Utility to safely parse AI responses
function parseAIResponse(response: string): ExtractedData | null {
  try {
    // Try direct JSON parse
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to find JSON object in response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    return null;
  }
}
```

---

## Error Handling

```typescript
interface AIExtractionResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
  rawResponse: string;
}

async function extractWithProvider(
  provider: AIProvider,
  imageBase64: string
): Promise<AIExtractionResult> {
  try {
    const response = await provider.analyze(imageBase64, EXTRACTION_PROMPT);
    const data = parseAIResponse(response);

    if (!data) {
      return {
        success: false,
        error: 'Failed to parse JSON from response',
        rawResponse: response
      };
    }

    return {
      success: true,
      data,
      rawResponse: response
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rawResponse: ''
    };
  }
}
```

---

## Quality Scoring

Compare results across providers:

```typescript
interface QualityMetrics {
  fieldsExtracted: number;
  totalFields: number;
  completenessScore: number; // 0-100
  hasActiveIngredients: boolean;
  hasDosage: boolean;
  hasWarnings: boolean;
}

function calculateQuality(data: ExtractedData): QualityMetrics {
  const requiredFields = [
    'product_name',
    'formulation_type',
    'dosage_instructions'
  ];

  const optionalFields = [
    'brand',
    'manufacturer',
    'ndc_code',
    'lot_number',
    'expiration_date'
  ];

  let extracted = 0;
  const total = requiredFields.length + optionalFields.length;

  for (const field of [...requiredFields, ...optionalFields]) {
    if (data[field as keyof ExtractedData]) extracted++;
  }

  return {
    fieldsExtracted: extracted,
    totalFields: total,
    completenessScore: Math.round((extracted / total) * 100),
    hasActiveIngredients:
      (data.drug_facts?.active_ingredients?.length ?? 0) > 0 ||
      (data.supplement_facts?.ingredients?.length ?? 0) > 0,
    hasDosage: !!data.dosage_instructions,
    hasWarnings:
      (data.warnings_contraindications?.length ?? 0) > 0 ||
      (data.drug_facts?.warnings?.length ?? 0) > 0
  };
}
```
