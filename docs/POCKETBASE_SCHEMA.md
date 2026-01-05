# Pocketbase Schema - Manual Creation Guide

## Overview

Create these collections manually in Pocketbase Admin UI (http://127.0.0.1:8090/_/).

---

## Collection 1: `evaluations`

Main collection for storing image evaluation requests.

### Fields

| Field Name | Type | Options | Description |
|------------|------|---------|-------------|
| `image` | File | Max 10MB, mime: image/* | Uploaded product label image |
| `product_name` | Text | Optional | Extracted product name |
| `status` | Select | pending, processing, completed, failed | Evaluation status |
| `total_duration_ms` | Number | Min: 0 | Total time from submission to completion |

### API Rules

| Rule | Value | Description |
|------|-------|-------------|
| **List/Search** | `""` | Anyone can list evaluations |
| **View** | `""` | Anyone can view single evaluation |
| **Create** | `""` | Anyone can create (from API routes) |
| **Update** | `@request.auth.id != "" \|\| @request.headers.x_api_key = "{{SERVER_API_KEY}}"` | Authenticated users or server API key |
| **Delete** | `@request.auth.id != ""` | Only authenticated users |

**Note:** For production, replace `""` with proper auth rules like `@request.auth.id != ""`

---

## Collection 2: `ai_results`

Stores individual AI provider results for each evaluation.

### Fields

| Field Name | Type | Options | Description |
|------------|------|---------|-------------|
| `evaluation` | Relation | Collection: evaluations, Required | Link to parent evaluation |
| `provider` | Select | gemini, groq, claude, openai, cloudvision | AI provider name |
| `status` | Select | pending, processing, completed, failed | Individual AI status |
| `extracted_data` | JSON | | Full extracted data object |
| `formulation` | JSON | | Extracted formulation details |
| `start_time` | DateTime | Required | When request was sent |
| `end_time` | DateTime | | When response was received |
| `duration_ms` | Number | Min: 0 | Time taken in milliseconds |
| `raw_response` | Text | Max: 100000 | Raw AI response text |
| `error_message` | Text | | Error message if failed |
| `tokens_used` | Number | Min: 0 | Tokens consumed (if available) |

### API Rules

| Rule | Value | Description |
|------|-------|-------------|
| **List/Search** | `@request.query.evaluation != ""` | Must filter by evaluation ID |
| **View** | `""` | Anyone can view single result |
| **Create** | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` | Server-only (API routes) |
| **Update** | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` | Server-only (API routes) |
| **Delete** | `@request.auth.id != ""` | Only authenticated users |

**Note:** AI results should only be created/updated by the server during evaluation processing.

---

## Collection 3: `web_results`

Stores web search results for formulation verification.

### Fields

| Field Name | Type | Options | Description |
|------------|------|---------|-------------|
| `evaluation` | Relation | Collection: evaluations, Required | Link to parent evaluation |
| `search_query` | Text | Required | Query used for search |
| `source_url` | URL | | Source website URL |
| `source_title` | Text | | Page title |
| `formulation_data` | JSON | | Extracted formulation from web |
| `confidence_score` | Number | Min: 0, Max: 100 | Confidence percentage |
| `snippet` | Text | | Relevant text snippet |

### API Rules

| Rule | Value | Description |
|------|-------|-------------|
| **List/Search** | `@request.query.evaluation != ""` | Must filter by evaluation ID |
| **View** | `""` | Anyone can view single result |
| **Create** | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` | Server-only (API routes) |
| **Update** | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` | Server-only (API routes) |
| **Delete** | `@request.auth.id != ""` | Only authenticated users |

**Note:** Web results are created by server during formulation search.

---

## API Rules Configuration Guide

### Setting Up Server API Key

1. **Generate a secure API key**:
   ```bash
   openssl rand -hex 32
   ```

2. **Add to `.env`**:
   ```env
   POCKETBASE_SERVER_API_KEY=your_generated_key_here
   ```

3. **Use in SvelteKit server routes**:
   ```typescript
   // src/lib/pocketbase/client.ts
   import PocketBase from 'pocketbase';
   import { POCKETBASE_URL, POCKETBASE_SERVER_API_KEY } from '$env/static/private';

   export function getServerPB() {
     const pb = new PocketBase(POCKETBASE_URL);
     // Add API key header for server requests
     pb.beforeSend = function (url, options) {
       options.headers = {
         ...options.headers,
         'x-api-key': POCKETBASE_SERVER_API_KEY
       };
       return { url, options };
     };
     return pb;
   }
   ```

### Production API Rules (Recommended)

For production with user authentication:

#### `evaluations` Collection
| Rule | Value |
|------|-------|
| List/Search | `@request.auth.id != ""` |
| View | `@request.auth.id != ""` |
| Create | `@request.auth.id != ""` |
| Update | `@request.auth.id = @collection.evaluations.user` |
| Delete | `@request.auth.id = @collection.evaluations.user` |

#### `ai_results` Collection
| Rule | Value |
|------|-------|
| List/Search | `@request.auth.id != "" && @collection.ai_results.evaluation.user = @request.auth.id` |
| View | `@collection.ai_results.evaluation.user = @request.auth.id` |
| Create | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` |
| Update | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` |
| Delete | `@collection.ai_results.evaluation.user = @request.auth.id` |

#### `web_results` Collection
| Rule | Value |
|------|-------|
| List/Search | `@request.auth.id != "" && @collection.web_results.evaluation.user = @request.auth.id` |
| View | `@collection.web_results.evaluation.user = @request.auth.id` |
| Create | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` |
| Update | `@request.headers.x_api_key = "{{SERVER_API_KEY}}"` |
| Delete | `@collection.web_results.evaluation.user = @request.auth.id` |

### Adding User Field (Production)

To enable user-based access control, add a `user` field to `evaluations`:

| Field Name | Type | Options |
|------------|------|---------|
| `user` | Relation | Collection: users, Required |

---

## JSON Field Structures

### `extracted_data` Structure

```json
{
  "product_name": "string",
  "brand": "string",
  "manufacturer": "string",
  "ndc_code": "string",
  "upc_code": "string",
  "formulation_type": "tablet|capsule|liquid|powder|cream|gel|patch|injection",
  "drug_facts": {
    "active_ingredients": [
      {
        "name": "string",
        "amount": "string",
        "unit": "string",
        "purpose": "string"
      }
    ],
    "inactive_ingredients": ["string"],
    "uses": ["string"],
    "warnings": ["string"],
    "directions": "string",
    "other_info": "string"
  },
  "supplement_facts": {
    "serving_size": "string",
    "servings_per_container": "number",
    "ingredients": [
      {
        "name": "string",
        "amount": "string",
        "unit": "string",
        "daily_value_percent": "number|null"
      }
    ],
    "other_ingredients": ["string"]
  },
  "dosage_instructions": "string",
  "warnings_contraindications": ["string"],
  "drug_interactions": ["string"],
  "storage_conditions": "string",
  "lot_number": "string",
  "expiration_date": "string",
  "net_contents": "string",
  "country_of_origin": "string"
}
```

### `formulation` Structure

```json
{
  "type": "string",
  "active_compounds": [
    {
      "name": "string",
      "cas_number": "string",
      "concentration": "string",
      "function": "string"
    }
  ],
  "excipients": [
    {
      "name": "string",
      "function": "binder|filler|lubricant|coating|preservative|colorant|flavoring"
    }
  ],
  "delivery_mechanism": "string",
  "release_type": "immediate|extended|delayed|sustained"
}
```

---

## Creating Collections via Pocketbase Admin

### Step-by-step:

1. **Open Pocketbase Admin**
   ```
   http://127.0.0.1:8090/_/
   ```

2. **Create `evaluations` collection**
   - Click "New collection"
   - Name: `evaluations`
   - Add fields as listed above
   - Save

3. **Create `ai_results` collection**
   - Click "New collection"
   - Name: `ai_results`
   - Add fields as listed above
   - For `evaluation` relation, select `evaluations` collection
   - Save

4. **Create `web_results` collection**
   - Click "New collection"
   - Name: `web_results`
   - Add fields as listed above
   - For `evaluation` relation, select `evaluations` collection
   - Save

---

## TypeScript Types

After creating collections, generate types:

```typescript
// src/lib/pocketbase/types.ts

export interface Evaluation {
  id: string;
  image: string;
  product_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_duration_ms?: number;
  created: string;
  updated: string;
}

export interface AIResult {
  id: string;
  evaluation: string;
  provider: 'gemini' | 'groq' | 'claude' | 'openai' | 'cloudvision';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data?: ExtractedData;
  formulation?: Formulation;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  raw_response?: string;
  error_message?: string;
  tokens_used?: number;
  created: string;
  updated: string;
}

export interface WebResult {
  id: string;
  evaluation: string;
  search_query: string;
  source_url?: string;
  source_title?: string;
  formulation_data?: Record<string, any>;
  confidence_score?: number;
  snippet?: string;
  created: string;
  updated: string;
}

export interface ExtractedData {
  product_name?: string;
  brand?: string;
  manufacturer?: string;
  ndc_code?: string;
  upc_code?: string;
  formulation_type?: string;
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

export interface DrugFacts {
  active_ingredients: ActiveIngredient[];
  inactive_ingredients: string[];
  uses: string[];
  warnings: string[];
  directions: string;
  other_info?: string;
}

export interface SupplementFacts {
  serving_size: string;
  servings_per_container?: number;
  ingredients: SupplementIngredient[];
  other_ingredients?: string[];
}

export interface ActiveIngredient {
  name: string;
  amount: string;
  unit: string;
  purpose?: string;
}

export interface SupplementIngredient {
  name: string;
  amount: string;
  unit: string;
  daily_value_percent?: number | null;
}

export interface Formulation {
  type: string;
  active_compounds: ActiveCompound[];
  excipients: Excipient[];
  delivery_mechanism?: string;
  release_type?: 'immediate' | 'extended' | 'delayed' | 'sustained';
}

export interface ActiveCompound {
  name: string;
  cas_number?: string;
  concentration: string;
  function?: string;
}

export interface Excipient {
  name: string;
  function?: string;
}
```
