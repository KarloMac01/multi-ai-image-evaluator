# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Pocketbase running locally (http://127.0.0.1:8090)
- API keys for AI providers (see AI_PROVIDERS.md)

---

## Step 1: Install Dependencies

### Add Tailwind CSS
```bash
npx svelte-add@latest tailwindcss
```

### Install packages
```bash
npm install pocketbase
npm install @google/generative-ai
npm install groq-sdk
npm install @mistralai/mistralai
npm install openai
npm install @google-cloud/vision
```

---

## Step 2: Environment Variables

Create `.env` file in project root:

```env
# Pocketbase
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_SERVER_API_KEY=your_server_api_key  # Generate with: openssl rand -hex 32

# AI API Keys (get from respective provider dashboards)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_key

# Optional: Google Cloud service account path
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Create `.env.example` for version control:
```env
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_SERVER_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
OPENAI_API_KEY=
GOOGLE_CLOUD_API_KEY=
```

---

## Step 3: Pocketbase Setup

1. **Start Pocketbase** (if not running):
   ```bash
   ./pocketbase serve
   ```

2. **Open Admin UI**:
   ```
   http://127.0.0.1:8090/_/
   ```

3. **Create Collections** (see POCKETBASE_SCHEMA.md):
   - `evaluations`
   - `ai_results`
   - `web_results`

---

## Step 4: Get API Keys

### Google Gemini (Free, No CC)
1. Go to https://aistudio.google.com/
2. Click "Get API Key"
3. Create new key
4. Copy to `GEMINI_API_KEY`

### Groq (Free, No CC)
1. Go to https://console.groq.com/
2. Sign up
3. Go to API Keys
4. Create key
5. Copy to `GROQ_API_KEY`

### Mistral (Free, No CC)
1. Go to https://console.mistral.ai/
2. Sign up
3. Go to API Keys
4. Generate key
5. Copy to `MISTRAL_API_KEY`

### OpenAI ($5 Credits)
1. Go to https://platform.openai.com/
2. Sign up (requires payment method)
3. Go to API Keys
4. Create secret key
5. Copy to `OPENAI_API_KEY`

### Google Cloud Vision (Free Tier)
1. Go to https://console.cloud.google.com/
2. Create project
3. Enable "Cloud Vision API"
4. Go to Credentials
5. Create API key
6. Copy to `GOOGLE_CLOUD_API_KEY`

---

## Step 5: Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

---

## Step 6: Test the Setup

1. **Test Pocketbase Connection**:
   - Check browser console for connection errors
   - Verify collections exist in PB admin

2. **Test Each AI Provider**:
   - Upload a test image
   - Check which providers return results
   - Check console for API errors

3. **Verify Timing**:
   - Ensure timing metrics are recorded
   - Check `ai_results.duration_ms` in Pocketbase

---

## Troubleshooting

### "Cannot connect to Pocketbase"
- Verify Pocketbase is running: `curl http://127.0.0.1:8090/api/health`
- Check `POCKETBASE_URL` in `.env`

### "API key invalid" errors
- Double-check key is copied correctly (no extra spaces)
- Verify key is for the correct service
- Check if free tier quota is exhausted

### "Rate limit exceeded"
- Groq: Wait 1 minute, max 30 RPM
- Gemini: Wait 1 minute, max 15 RPM
- Mistral: Wait 1 second between requests

### "CORS errors"
- Pocketbase handles CORS automatically
- For AI APIs, all calls should go through SvelteKit server routes

### "Module not found" errors
```bash
rm -rf node_modules
npm install
```

---

## Production Deployment

### Environment Variables
Set all env vars in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Railway: Variables tab

### Pocketbase Hosting
Options:
- Self-host on VPS (DigitalOcean, Hetzner)
- PocketHost (https://pockethost.io/) - managed hosting
- Fly.io with persistent volume

### Build Command
```bash
npm run build
```

### API Keys Security
- Never commit `.env` file
- Use environment variables in production
- Consider using secrets manager for sensitive keys
