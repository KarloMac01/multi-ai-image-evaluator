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

## 3. Anthropic Claude (Claude 3.5 Sonnet)

### Overview
Anthropic's Claude models offer exceptional reasoning and image understanding capabilities with strong safety features.

### Pricing
- **Usage-based pricing** (no free tier)
- **Claude 3.5 Sonnet**: $3/1M input tokens, $15/1M output tokens
- **Claude Sonnet 4**: $3/1M input tokens, $15/1M output tokens

### API Setup
```bash
npm install @anthropic-ai/sdk
```

### Get API Key
1. Go to https://console.anthropic.com/
2. Create an account
3. Navigate to API Keys
4. Create new key

### Environment Variable
```env
ANTHROPIC_API_KEY=your_api_key_here
```

### Vision Models Available
- `claude-sonnet-4-20250514` (recommended)
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229` (most capable)

### Best For
- High accuracy extraction
- Complex reasoning about label contents
- Medical/pharmaceutical terminology
- Nuanced interpretation

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

| Feature | Gemini | Groq | Claude | OpenAI | Cloud Vision |
|---------|--------|------|--------|--------|--------------|
| Free requests/day | ~1000 | 14,400 | Paid | Limited | ~33/day |
| Credit card required | No | No | Yes | Yes | No |
| Latency | Medium | Fastest | Medium | Slow | Fast |
| OCR quality | Good | Good | Excellent | Excellent | Best |
| Reasoning | Excellent | Good | Excellent | Excellent | None |
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
