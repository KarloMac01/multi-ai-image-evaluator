# AI Vision Providers - Detailed Guide

## 1. Google Gemini (Gemini 2.5 Flash)

### Overview
Google's Gemini API offers the most generous free tier in the industry with no credit card required.

### Free Tier Limits
- **Requests**: ~1,000 requests/day (Gemini 2.5 Flash)
- **Context Window**: 1 million tokens
- **Rate Limit**: 15 RPM (requests per minute)
- **Tokens**: 250,000 TPM (tokens per minute)

### API Setup
```bash
npm install @google/generative-ai
```

### Get API Key
1. Go to https://aistudio.google.com/
2. Click "Get API Key"
3. Create new API key (no credit card required)

### Environment Variable
```env
GEMINI_API_KEY=your_api_key_here
```

### Best For
- General image analysis
- OCR text extraction
- Complex reasoning about label contents

---

## 2. Groq (Llama 4 Scout)

### Overview
Groq offers ultra-fast inference using their custom LPU (Language Processing Unit) hardware. Free tier is very generous.

### Free Tier Limits
- **Requests**: 14,400 requests/day
- **Rate Limit**: 30 RPM
- **Tokens**: 15,000 TPM
- **No credit card required**

### API Setup
```bash
npm install groq-sdk
```

### Get API Key
1. Go to https://console.groq.com/
2. Sign up for free account
3. Navigate to API Keys section
4. Create new API key

### Environment Variable
```env
GROQ_API_KEY=your_api_key_here
```

### Vision Models Available
- `meta-llama/llama-4-scout-17b-16e-instruct` (recommended)
- `meta-llama/llama-4-maverick-17b-128e-instruct`

### Best For
- Fast inference (lowest latency)
- Structured JSON output
- High-volume processing

---

## 3. Mistral (Pixtral 12B)

### Overview
Mistral's Pixtral models are purpose-built for document and image understanding with strong OCR capabilities.

### Free Tier Limits
- **Rate Limit**: 1 request/second
- **Tokens**: 500,000 tokens/minute
- **No credit card required** (La Plateforme free tier)

### API Setup
```bash
npm install @mistralai/mistralai
```

### Get API Key
1. Go to https://console.mistral.ai/
2. Create free account
3. Navigate to API Keys
4. Generate new key

### Environment Variable
```env
MISTRAL_API_KEY=your_api_key_here
```

### Vision Models Available
- `pixtral-12b-2409` (free tier)
- `pixtral-large-latest` (paid)

### Best For
- Document understanding
- Complex table/chart extraction
- Multi-language labels

---

## 4. OpenAI (GPT-4o Mini)

### Overview
OpenAI's vision models offer high accuracy but require payment info. New accounts get $5 in free credits.

### Free Tier Limits
- **Credits**: $5 initial (expires in 3 months)
- **GPT-4o Mini Pricing**: $0.15/1M input, $0.60/1M output tokens
- **Effective free usage**: ~33M input tokens or ~8M output tokens

### API Setup
```bash
npm install openai
```

### Get API Key
1. Go to https://platform.openai.com/
2. Sign up and add payment method
3. Navigate to API Keys
4. Create new secret key

### Environment Variable
```env
OPENAI_API_KEY=your_api_key_here
```

### Vision Models Available
- `gpt-4o-mini` (recommended for cost)
- `gpt-4o` (higher accuracy, more expensive)

### Best For
- Highest accuracy extraction
- Complex ingredient parsing
- Medical/pharmaceutical terminology

---

## 5. Google Cloud Vision API

### Overview
Specialized computer vision API optimized for OCR, object detection, and image labeling. Different from Gemini.

### Free Tier Limits
- **Units**: 1,000 units/month free
- **Each feature = 1 unit** (OCR, label detection, etc.)
- **New customers**: $300 free credits

### API Setup
```bash
npm install @google-cloud/vision
```

### Get API Key
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Cloud Vision API
4. Create service account or API key
5. Download credentials JSON

### Environment Variable
```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
# OR for service account:
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Features to Use
- `TEXT_DETECTION` - Basic OCR
- `DOCUMENT_TEXT_DETECTION` - Dense text OCR (recommended for labels)
- `LABEL_DETECTION` - Identify objects/concepts

### Best For
- Pure OCR extraction
- Structured document parsing
- Barcode/QR code detection

---

## Comparison Matrix

| Feature | Gemini | Groq | Mistral | OpenAI | Cloud Vision |
|---------|--------|------|---------|--------|--------------|
| Free requests/day | ~1000 | 14,400 | ~86,400 | Limited | ~33/day |
| Credit card required | No | No | No | Yes | No |
| Latency | Medium | Fastest | Medium | Slow | Fast |
| OCR quality | Good | Good | Excellent | Excellent | Best |
| Reasoning | Excellent | Good | Good | Excellent | None |
| JSON output | Yes | Yes | Yes | Yes | Native |

---

## Rate Limit Handling Strategy

```typescript
// Implement exponential backoff for rate limits
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```
