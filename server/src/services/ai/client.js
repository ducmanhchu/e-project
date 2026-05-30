export { Type } from "@google/genai";
export { claude } from "@server/config/claude";
export { genai } from "@server/config/gemini";

import { env } from "@server/config/environment";

/**
 * Run primary → fallback pattern
 * Order determined by AI_PRIMARY_PROVIDER env: "claude" (default) | "vertex"
 */
export async function withFallback(label, claudeFn, geminiFn) {
  const isClaudePrimary = !["vertex", "gemini"].includes(env.AI_PRIMARY_PROVIDER);
  const [primaryFn, primaryName, fallbackFn, fallbackName] = isClaudePrimary
    ? [claudeFn, "claude", geminiFn, "gemini"]
    : [geminiFn, "gemini", claudeFn, "claude"];

  try {
    const result = await primaryFn();
    return { result, provider: primaryName };
  } catch (err) {
    console.warn(`[AI] ${primaryName} ${label} failed, falling back to ${fallbackName}:`, err.message);
    const result = await fallbackFn();
    return { result, provider: fallbackName };
  }
}
