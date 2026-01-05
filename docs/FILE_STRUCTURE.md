# Project File Structure

## Complete Directory Layout

```
multi-ai-image-evaluator/
├── docs/                           # Documentation
│   ├── PROJECT_PLAN.md
│   ├── AI_PROVIDERS.md
│   ├── POCKETBASE_SCHEMA.md
│   ├── FILE_STRUCTURE.md
│   ├── SETUP.md
│   └── EXTRACTION_PROMPT.md
│
├── src/
│   ├── app.html                    # HTML template
│   ├── app.css                     # Global styles (Tailwind)
│   ├── app.d.ts                    # Global TypeScript declarations
│   │
│   ├── lib/
│   │   ├── index.ts                # Lib barrel export
│   │   │
│   │   ├── ai/                     # AI Service Layer
│   │   │   ├── index.ts            # AI orchestrator (parallel execution)
│   │   │   ├── types.ts            # Shared AI types & interfaces
│   │   │   ├── prompt.ts           # Extraction prompt template
│   │   │   ├── gemini.ts           # Google Gemini adapter
│   │   │   ├── groq.ts             # Groq (Llama 4) adapter
│   │   │   ├── claude.ts           # Anthropic Claude adapter
│   │   │   ├── openai.ts           # OpenAI GPT-4o adapter
│   │   │   └── cloudvision.ts      # Google Cloud Vision adapter
│   │   │
│   │   ├── pocketbase/             # Pocketbase Integration
│   │   │   ├── client.ts           # PB client initialization
│   │   │   └── types.ts            # PB collection TypeScript types
│   │   │
│   │   ├── components/             # Svelte Components
│   │   │   ├── ImageUpload.svelte  # Drag-drop image uploader
│   │   │   ├── ResultCard.svelte   # Single AI result display
│   │   │   ├── ResultsGrid.svelte  # Grid of all AI results
│   │   │   ├── TimingChart.svelte  # Timing visualization
│   │   │   ├── FormulationView.svelte  # Formulation details
│   │   │   ├── EvaluationList.svelte   # History list
│   │   │   ├── StatusBadge.svelte  # Status indicator
│   │   │   └── LoadingSpinner.svelte   # Loading state
│   │   │
│   │   ├── stores/                 # Svelte Stores
│   │   │   └── evaluation.ts       # Current evaluation state
│   │   │
│   │   └── utils/                  # Utilities
│   │       ├── timing.ts           # Timing measurement helpers
│   │       └── format.ts           # Data formatting helpers
│   │
│   └── routes/
│       ├── +layout.svelte          # App layout with navigation
│       ├── +page.svelte            # Main evaluation page
│       │
│       ├── history/
│       │   ├── +page.svelte        # Evaluation history list
│       │   └── +page.server.ts     # Load history data
│       │
│       ├── evaluation/
│       │   └── [id]/
│       │       ├── +page.svelte    # Single evaluation detail
│       │       └── +page.server.ts # Load evaluation data
│       │
│       └── api/
│           ├── evaluate/
│           │   └── +server.ts      # POST: Submit image for evaluation
│           │
│           ├── evaluations/
│           │   ├── +server.ts      # GET: List all evaluations
│           │   └── [id]/
│           │       └── +server.ts  # GET: Single evaluation details
│           │
│           └── web-search/
│               └── +server.ts      # POST: Search formulation online
│
├── static/
│   └── favicon.png
│
├── .env                            # Environment variables (create this)
├── .env.example                    # Example env file
├── package.json
├── svelte.config.js
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS for Tailwind
├── tsconfig.json
└── vite.config.ts
```

---

## Key Files Description

### AI Service Layer (`src/lib/ai/`)

| File | Purpose |
|------|---------|
| `index.ts` | Orchestrates parallel AI calls, aggregates results |
| `types.ts` | Defines `AIProvider`, `AIResult`, `ExtractionResult` interfaces |
| `prompt.ts` | Contains the standardized extraction prompt template |
| `gemini.ts` | Google Gemini API integration |
| `groq.ts` | Groq API integration (Llama 4 vision) |
| `claude.ts` | Anthropic Claude API integration |
| `openai.ts` | OpenAI API integration (GPT-4o) |
| `cloudvision.ts` | Google Cloud Vision API integration |

### Pocketbase Layer (`src/lib/pocketbase/`)

| File | Purpose |
|------|---------|
| `client.ts` | Initializes and exports PocketBase client instance |
| `types.ts` | TypeScript types matching PB collections |

### Components (`src/lib/components/`)

| Component | Purpose |
|-----------|---------|
| `ImageUpload.svelte` | Drag-drop zone, file input, preview |
| `ResultCard.svelte` | Displays single AI provider result |
| `ResultsGrid.svelte` | Side-by-side comparison of all results |
| `TimingChart.svelte` | Bar chart showing AI response times |
| `FormulationView.svelte` | Detailed formulation breakdown |
| `EvaluationList.svelte` | Paginated list of past evaluations |
| `StatusBadge.svelte` | Visual status indicator (pending/processing/done) |
| `LoadingSpinner.svelte` | Loading animation |

### API Routes (`src/routes/api/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/evaluate` | POST | Accept image, trigger all AI evaluations |
| `/api/evaluations` | GET | List all evaluations with pagination |
| `/api/evaluations/[id]` | GET | Get single evaluation with all AI results |
| `/api/web-search` | POST | Search web for product formulation |

### Pages (`src/routes/`)

| Route | Purpose |
|-------|---------|
| `/` | Main page - upload image, view live results |
| `/history` | Browse past evaluations |
| `/evaluation/[id]` | Detailed view of specific evaluation |

---

## Data Flow

```
1. User uploads image on main page
   └─▶ ImageUpload.svelte handles file

2. POST /api/evaluate with image
   └─▶ Creates evaluation record in Pocketbase
   └─▶ Uploads image to Pocketbase storage
   └─▶ Triggers parallel AI calls

3. Each AI adapter:
   └─▶ Records start_time
   └─▶ Sends image + prompt to AI API
   └─▶ Records end_time
   └─▶ Parses response into structured data
   └─▶ Saves AIResult to Pocketbase

4. Frontend polls/streams for updates
   └─▶ ResultsGrid shows each AI as it completes
   └─▶ TimingChart updates with durations

5. User can browse history
   └─▶ /history shows all past evaluations
   └─▶ Click to view full details
```
