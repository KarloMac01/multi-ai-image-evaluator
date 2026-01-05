# Multi-AI Product Label Evaluator - Documentation

## Quick Links

| Document | Description |
|----------|-------------|
| [PROJECT_PLAN.md](./PROJECT_PLAN.md) | Overall project plan and architecture |
| [AI_PROVIDERS.md](./AI_PROVIDERS.md) | Detailed guide for each AI provider |
| [POCKETBASE_SCHEMA.md](./POCKETBASE_SCHEMA.md) | Database schema for Pocketbase |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Complete project file structure |
| [SETUP.md](./SETUP.md) | Installation and setup guide |
| [EXTRACTION_PROMPT.md](./EXTRACTION_PROMPT.md) | AI prompt strategy for label extraction |
| [API_REFERENCE.md](./API_REFERENCE.md) | API endpoint documentation |

---

## Project Summary

A SvelteKit application that evaluates pharmaceutical/supplement product label images using **5 free AI vision APIs** simultaneously, extracts formulation data, and stores results in Pocketbase with timing metrics.

### Tech Stack
- **Frontend**: SvelteKit 5 + Tailwind CSS
- **Backend**: SvelteKit API routes
- **Database**: Pocketbase
- **AI Services**: Gemini, Groq, Claude, OpenAI, Google Cloud Vision

### Key Features
1. Upload product label image
2. Parallel evaluation by 5 AI providers
3. Timing metrics for each AI call
4. Structured extraction (Drug Facts, Supplement Facts)
5. Web search for formulation verification
6. Side-by-side result comparison
7. Evaluation history

---

## AI Providers Summary

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| Google Gemini | 1000 req/day, no CC | General analysis |
| Groq | 14,400 req/day | Fastest inference |
| Claude | Usage-based | High accuracy, reasoning |
| OpenAI | $5 credits | Highest accuracy |
| Cloud Vision | 1000 units/month | Pure OCR |

---

## Getting Started

1. **Prerequisites**
   - Node.js 18+
   - Pocketbase running

2. **Install**
   ```bash
   npx svelte-add@latest tailwindcss
   npm install pocketbase @google/generative-ai groq-sdk @anthropic-ai/sdk openai @google-cloud/vision
   ```

3. **Configure**
   - Create `.env` with API keys
   - Create Pocketbase collections

4. **Run**
   ```bash
   npm run dev
   ```

See [SETUP.md](./SETUP.md) for detailed instructions.

---

## Implementation Phases

1. **Phase 1**: Project setup, Tailwind, dependencies
2. **Phase 2**: AI service integration layer (5 adapters)
3. **Phase 3**: API routes for evaluation
4. **Phase 4**: Frontend components
5. **Phase 5**: Web search integration
