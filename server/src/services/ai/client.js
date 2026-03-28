export { Type } from "@google/genai";
export { claude } from "@server/config/claude";
export { genai } from "@server/config/gemini";

/**
 * Run primary (Claude) → fallback (Gemini) pattern
 */
export async function withFallback(label, primaryFn, fallbackFn) {
  try {
    const result = await primaryFn();
    return { result, provider: "claude" };
  } catch (err) {
    console.warn(`[AI] Claude ${label} failed, falling back to Gemini:`, err.message);
    const result = await fallbackFn();
    return { result, provider: "gemini" };
  }
}
