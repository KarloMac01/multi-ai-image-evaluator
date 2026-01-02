# API Reference

## Overview

All API routes are implemented as SvelteKit server endpoints under `/src/routes/api/`.

---

## Endpoints

### POST `/api/evaluate`

Submit an image for multi-AI evaluation.

#### Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Product label image (JPEG, PNG, WebP) |
| `providers` | string | No | Comma-separated list of providers to use (default: all) |

#### Example Request

```typescript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('providers', 'gemini,groq,mistral'); // optional

const response = await fetch('/api/evaluate', {
  method: 'POST',
  body: formData
});
```

#### Response

```json
{
  "success": true,
  "evaluation": {
    "id": "abc123xyz",
    "status": "processing",
    "created": "2025-01-02T12:00:00.000Z",
    "image": "evaluations/abc123xyz/label.jpg"
  },
  "message": "Evaluation started. Poll for results."
}
```

#### Error Response

```json
{
  "success": false,
  "error": "No image file provided"
}
```

---

### GET `/api/evaluations`

List all evaluations with pagination.

#### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | all | Filter by status |
| `sort` | string | -created | Sort field (prefix `-` for desc) |

#### Example Request

```typescript
const response = await fetch('/api/evaluations?page=1&limit=10&status=completed');
```

#### Response

```json
{
  "success": true,
  "evaluations": [
    {
      "id": "abc123xyz",
      "product_name": "Vitamin D3 5000 IU",
      "status": "completed",
      "total_duration_ms": 4523,
      "created": "2025-01-02T12:00:00.000Z",
      "ai_results_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### GET `/api/evaluations/[id]`

Get detailed evaluation with all AI results.

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Evaluation ID |

#### Example Request

```typescript
const response = await fetch('/api/evaluations/abc123xyz');
```

#### Response

```json
{
  "success": true,
  "evaluation": {
    "id": "abc123xyz",
    "image": "evaluations/abc123xyz/label.jpg",
    "product_name": "Vitamin D3 5000 IU",
    "status": "completed",
    "total_duration_ms": 4523,
    "created": "2025-01-02T12:00:00.000Z"
  },
  "ai_results": [
    {
      "id": "result001",
      "provider": "gemini",
      "status": "completed",
      "duration_ms": 2341,
      "extracted_data": {
        "product_name": "Vitamin D3 5000 IU",
        "brand": "Nature Made",
        "formulation_type": "softgel",
        "supplement_facts": {
          "serving_size": "1 softgel",
          "ingredients": [
            {
              "name": "Vitamin D3",
              "amount": "125",
              "unit": "mcg",
              "daily_value_percent": 625
            }
          ]
        }
      },
      "formulation": {
        "type": "softgel capsule",
        "active_compounds": [
          {
            "name": "Cholecalciferol",
            "concentration": "125 mcg (5000 IU)",
            "function": "Vitamin D supplementation"
          }
        ]
      }
    },
    {
      "id": "result002",
      "provider": "groq",
      "status": "completed",
      "duration_ms": 1205,
      "extracted_data": { }
    }
  ],
  "web_results": [
    {
      "id": "web001",
      "search_query": "Vitamin D3 5000 IU Nature Made formulation",
      "source_url": "https://example.com/product",
      "formulation_data": { },
      "confidence_score": 85
    }
  ]
}
```

---

### POST `/api/web-search`

Search web for product formulation information.

#### Request

**Content-Type:** `application/json`

```json
{
  "evaluation_id": "abc123xyz",
  "query": "Vitamin D3 5000 IU Nature Made ingredients formulation",
  "product_name": "Vitamin D3 5000 IU"
}
```

#### Response

```json
{
  "success": true,
  "results": [
    {
      "id": "web001",
      "source_url": "https://naturemade.com/products/vitamin-d3",
      "source_title": "Vitamin D3 5000 IU | Nature Made",
      "snippet": "Each softgel contains 125 mcg (5000 IU) of Vitamin D3...",
      "formulation_data": {
        "active_ingredient": "Cholecalciferol",
        "form": "Softgel",
        "excipients": ["Soybean Oil", "Gelatin", "Glycerin"]
      },
      "confidence_score": 92
    }
  ]
}
```

---

## WebSocket Events (Optional Enhancement)

For real-time updates, implement Server-Sent Events:

### GET `/api/evaluations/[id]/stream`

Stream evaluation progress updates.

```typescript
const eventSource = new EventSource(`/api/evaluations/${id}/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
  // { provider: 'gemini', status: 'completed', duration_ms: 2341 }
};

eventSource.onerror = () => {
  eventSource.close();
};
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request - missing or invalid parameters |
| 404 | Evaluation not found |
| 413 | Image file too large (max 10MB) |
| 415 | Unsupported image format |
| 429 | Rate limited by AI provider |
| 500 | Internal server error |
| 503 | AI provider unavailable |

---

## Rate Limiting

The API implements per-provider rate limiting:

| Provider | Limit | Window |
|----------|-------|--------|
| Gemini | 15 requests | per minute |
| Groq | 30 requests | per minute |
| Mistral | 60 requests | per minute |
| OpenAI | 60 requests | per minute |
| Cloud Vision | 1800 requests | per minute |

Exceeded limits return `429 Too Many Requests`:

```json
{
  "success": false,
  "error": "Rate limit exceeded for provider: gemini",
  "retryAfter": 45
}
```

---

## Image Requirements

| Constraint | Value |
|------------|-------|
| Max file size | 10 MB |
| Supported formats | JPEG, PNG, WebP, GIF |
| Min resolution | 200x200 px |
| Max resolution | 4096x4096 px |
| Recommended | 1000-2000px on longest side |

---

## TypeScript Types

```typescript
// API Response types
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface EvaluationResponse {
  evaluation: Evaluation;
  ai_results: AIResult[];
  web_results: WebResult[];
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```
