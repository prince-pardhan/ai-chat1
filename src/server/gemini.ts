import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export const SYSTEM_PROMPT = `You are AI Chat Pro, an advanced, highly capable, and empathetic AI assistant with the tagline "Ask Anything. Learn Everything."

Key Behavioral Rules:
1. Multi-Language Fluency:
   - Provide natural, fluent, and accurate responses in English, Hindi (हिंदी), and Hinglish (natural Romanized Hindi like "Haan bilkul, main aapki poori madad karunga!").
   - Match the user's language and tone seamlessly. If the user asks in Hinglish, reply naturally in Hinglish. If in Hindi (Devanagari), reply in Hindi. If in English, reply in English.
2. Structure & Clarity:
   - Use clean Markdown formatting: clear headings (#, ##, ###), bullet lists, bold text for key terms, numbered steps, and tables where comparative data is helpful.
3. Code & Technical Expertise:
   - Always specify the programming language tag in code fences (e.g. \`\`\`typescript, \`\`\`python, \`\`\`html, \`\`\`sql).
   - Write modern, production-grade, well-commented code with concise explanations.
4. Explanations & Tone:
   - Provide direct, helpful, and insightful answers without unnecessary fluff or excessive meta-commentary.
   - For complex questions (math, science, programming, analysis), break down the solution step by step.`;

export function formatFriendlyErrorMessage(rawError: any): string {
  const str = typeof rawError === 'string' ? rawError : rawError?.message || JSON.stringify(rawError || '');
  
  if (str.includes('503') || str.includes('high demand') || str.includes('UNAVAILABLE')) {
    return 'The AI service is currently experiencing high demand. Spikes in demand are usually temporary. Please click "Retry" below to try again.';
  }
  if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED')) {
    return 'Rate limit reached. Please wait a few seconds and try again.';
  }
  if (str.includes('API key') || str.includes('API_KEY_INVALID')) {
    return 'Invalid or missing API key. Please check your GEMINI_API_KEY configuration.';
  }

  // Try extracting inner message if it's nested JSON
  try {
    const parsed = JSON.parse(str);
    if (parsed.error?.message) {
      return formatFriendlyErrorMessage(parsed.error.message);
    }
  } catch {
    // Not json
  }

  return str.replace(/^Error:\s*/i, '').slice(0, 300);
}

export async function generateChatTitle(firstMessage: string): Promise<string> {
  if (!hasApiKey()) {
    const clean = firstMessage.trim().replace(/[^\w\s]/gi, '').slice(0, 30);
    return clean.charAt(0).toUpperCase() + clean.slice(1) || 'New Conversation';
  }

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of modelsToTry) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: `Generate a concise 3 to 5 word title summarizing this user message. Respond with ONLY the title itself, no quotes, no punctuation at the end, no explanation:\n\n"${firstMessage.slice(0, 300)}"`,
        config: {
          maxOutputTokens: 20,
          temperature: 0.3,
        },
      });

      const title = response.text?.trim()?.replace(/^["']|["']$/g, '');
      if (title && title.length > 0 && title.length < 50) {
        return title;
      }
    } catch (err) {
      // Try next model if title generation fails
      continue;
    }
  }

  const fallback = firstMessage.trim().replace(/[^\w\s]/gi, '').slice(0, 30);
  return fallback.charAt(0).toUpperCase() + fallback.slice(1) || 'New Conversation';
}

export async function streamWithFallback(
  contents: any[],
  onChunk: (text: string) => void
): Promise<{ fullText: string; modelUsed: string }> {
  const ai = getGeminiClient();
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    let fullText = '';
    let hasSentAnyChunk = false;

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          hasSentAnyChunk = true;
          fullText += text;
          onChunk(text);
        }
      }

      return { fullText, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} stream error:`, err?.message || err);

      // If we already sent chunks to client, don't restart with another model as chunks would be jumbled
      if (hasSentAnyChunk) {
        throw err;
      }

      // Check if error is retryable (503 high demand, 429 rate limit, 500 internal error)
      const errStr = String(err?.message || err);
      const isCapacityIssue =
        errStr.includes('503') ||
        errStr.includes('429') ||
        errStr.includes('high demand') ||
        errStr.includes('UNAVAILABLE') ||
        errStr.includes('RESOURCE_EXHAUSTED');

      if (isCapacityIssue && i < candidateModels.length - 1) {
        // Wait 500ms and try next model
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error('All models were unavailable. Please try again.');
}
