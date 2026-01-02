# Multi-AI Product Label Evaluator

A SvelteKit application that evaluates pharmaceutical and supplement product label images using **5 free AI vision APIs** simultaneously, extracts formulation data, and stores results in Pocketbase with timing metrics.

## Features

- **Parallel AI Evaluation** - All 5 AI services analyze your image simultaneously
- **Drug Facts Extraction** - Extract active ingredients, dosages, warnings, and formulation details
- **Supplement Facts Parsing** - Capture serving sizes, ingredients, and daily values
- **Performance Metrics** - Track response times and compare accuracy across AI providers
- **Evaluation History** - Browse and compare past evaluations
- **Web Search Integration** - Verify formulations against online sources

## Tech Stack

- **Frontend**: SvelteKit 5 + Tailwind CSS
- **Backend**: SvelteKit API routes
- **Database**: [Pocketbase](https://pocketbase.io/)
- **AI Services**: Google Gemini, Groq, Mistral, OpenAI, Google Cloud Vision

## AI Providers

| Provider | Model | Free Tier | Best For |
|----------|-------|-----------|----------|
| **Google Gemini** | Gemini 2.0 Flash | 1000 req/day, no CC | General analysis, OCR |
| **Groq** | Llama 4 Scout | 14,400 req/day | Fastest inference |
| **Mistral** | Pixtral 12B | 500K tokens/min | Document understanding |
| **OpenAI** | GPT-4o Mini | $5 credits (3 months) | Highest accuracy |
| **Cloud Vision** | Document Text Detection | 1000 units/month | Pure OCR |

## Quick Start

### Prerequisites

- Node.js 18+
- Pocketbase instance running

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd multi-ai-image-evaluator

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your API keys:

```env
# Pocketbase
PUBLIC_POCKETBASE_URL=https://your-pocketbase-url.com
POCKETBASE_SERVER_API_KEY=your_server_key

# AI API Keys (get from respective provider dashboards)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
GOOGLE_CLOUD_API_KEY=your_cloud_vision_key
```

### Pocketbase Setup

Create the following collections in your Pocketbase instance:
- `evaluations` - Stores uploaded images and evaluation status
- `ai_results` - Stores individual AI provider results
- `web_results` - Stores web search results

See [docs/POCKETBASE_SCHEMA.md](./docs/POCKETBASE_SCHEMA.md) for detailed schema.

### Development

```bash
# Start development server
npm run dev

# Type checking
npm run check

# Build for production
npm run build
```

## Project Structure

```
src/
├── lib/
│   ├── ai/              # AI service adapters
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   ├── mistral.ts
│   │   ├── openai.ts
│   │   └── cloudvision.ts
│   ├── pocketbase/      # Database client and types
│   ├── components/      # Svelte components
│   └── utils/           # Utility functions
├── routes/
│   ├── api/             # API endpoints
│   ├── history/         # Evaluation history page
│   └── evaluation/[id]/ # Single evaluation view
└── app.css              # Global styles
```

## Documentation

Detailed documentation is available in the `/docs` folder:

| Document | Description |
|----------|-------------|
| [PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) | Architecture and implementation phases |
| [AI_PROVIDERS.md](./docs/AI_PROVIDERS.md) | Detailed guide for each AI provider |
| [POCKETBASE_SCHEMA.md](./docs/POCKETBASE_SCHEMA.md) | Database schema with API rules |
| [FILE_STRUCTURE.md](./docs/FILE_STRUCTURE.md) | Complete project file structure |
| [SETUP.md](./docs/SETUP.md) | Step-by-step installation guide |
| [EXTRACTION_PROMPT.md](./docs/EXTRACTION_PROMPT.md) | AI prompt strategy |
| [API_REFERENCE.md](./docs/API_REFERENCE.md) | API endpoint documentation |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/evaluate` | POST | Submit image for multi-AI evaluation |
| `/api/evaluations` | GET | List all evaluations |
| `/api/evaluations/[id]` | GET | Get single evaluation with results |
| `/api/web-search` | POST | Search web for formulation data |

## Getting API Keys

### Google Gemini (Free, No CC)
1. Go to https://aistudio.google.com/
2. Click "Get API Key" → Create new key

### Groq (Free, No CC)
1. Go to https://console.groq.com/
2. Sign up → API Keys → Create key

### Mistral (Free, No CC)
1. Go to https://console.mistral.ai/
2. Sign up → API Keys → Generate key

### OpenAI ($5 Credits)
1. Go to https://platform.openai.com/
2. Sign up (requires payment method) → API Keys → Create secret key

### Google Cloud Vision (Free Tier)
1. Go to https://console.cloud.google.com/
2. Create project → Enable Cloud Vision API → Create API key

## License

MIT
