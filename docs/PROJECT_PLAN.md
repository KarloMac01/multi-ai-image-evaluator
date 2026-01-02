# Multi-AI Product Label Evaluator - Project Plan

## Overview

Build a SvelteKit application that evaluates **pharmaceutical/supplement product label images** using multiple AI services to extract formulation data, with results stored in Pocketbase and timing metrics tracked.

**Tech Stack:** SvelteKit 5 + Tailwind CSS + Pocketbase

---

## Top 5 Free AI Vision APIs

| # | Provider | Model | Free Tier | Best For |
|---|----------|-------|-----------|----------|
| 1 | **Google Gemini** | Gemini 2.5 Flash | 1000 req/day, no CC required | General analysis, OCR |
| 2 | **Groq** | Llama 4 Scout | 14,400 req/day, ultra-fast | Speed, structured output |
| 3 | **Mistral** | Pixtral 12B | 500K tokens/min | Document understanding |
| 4 | **OpenAI** | GPT-4o Mini | $5 credits (3 months) | High accuracy extraction |
| 5 | **Google Cloud Vision** | Vision API | 1,000 units/month | Specialized OCR |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SvelteKit Frontend                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ Image Upload │  │ Results Display │  │ Timing Dashboard │    │
│  └─────────────┘  └─────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SvelteKit API Routes                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/evaluate - Orchestrates parallel AI calls       │  │
│  │ GET /api/evaluations - List past evaluations              │  │
│  │ POST /api/web-search - Search formulations online         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  AI Services    │ │   Web Search    │ │   Pocketbase    │
│  (5 providers)  │ │  (formulation)  │ │   (storage)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure
- Install Tailwind CSS and dependencies
- Create environment variables configuration
- Set up Pocketbase client connection
- Create TypeScript types for data models

### Phase 2: AI Service Integration Layer
- Create unified AI service interface
- Implement each provider adapter:
  - `src/lib/ai/gemini.ts`
  - `src/lib/ai/groq.ts`
  - `src/lib/ai/mistral.ts`
  - `src/lib/ai/openai.ts`
  - `src/lib/ai/cloudvision.ts`
- Add timing wrapper for each call
- Create parallel execution orchestrator

### Phase 3: API Routes
- `POST /api/evaluate` - Accept image, call all AIs in parallel
- `GET /api/evaluations` - List evaluations with results
- `GET /api/evaluations/[id]` - Single evaluation details
- `POST /api/web-search` - Search for formulations online

### Phase 4: Frontend Components
- Image upload component with drag-drop
- Results comparison view (side-by-side AI results)
- Timing metrics dashboard
- Evaluation history list

### Phase 5: Web Search Integration
- Implement formulation web search
- Parse and structure web results
- Store and display alongside AI extractions

---

## Key Features

1. **Parallel AI Evaluation**: All 5 AIs process simultaneously
2. **Timing Metrics**: Track start/end time for each AI call
3. **Unified Extraction Schema**: Normalize results across providers
4. **Comparison View**: Side-by-side AI results
5. **Web Search Integration**: Find formulations online
6. **History Tracking**: Browse past evaluations
