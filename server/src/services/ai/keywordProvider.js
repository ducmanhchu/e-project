import { Type, claude, genai, withFallback } from "./client";

const TRANSLATE_PROMPT = (keywords) =>
  `You are a Vietnamese-English teaching assistant.

Translate each English keyword to Vietnamese. Provide a short, clear Vietnamese meaning (1-4 words) suitable for language learners.

Keywords: ${JSON.stringify(keywords)}

Return the translations as an array of objects with "word" and "viMeaning" fields.`;

async function translateWithClaude(keywords) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      { role: "user", content: TRANSLATE_PROMPT(keywords) },
    ],
    tools: [
      {
        name: "return_translations",
        description: "Return keyword translations",
        input_schema: {
          type: "object",
          properties: {
            translations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  viMeaning: { type: "string" },
                },
                required: ["word", "viMeaning"],
              },
            },
          },
          required: ["translations"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_translations" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function translateWithGemini(keywords) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: TRANSLATE_PROMPT(keywords),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          translations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                viMeaning: { type: Type.STRING },
              },
              propertyOrdering: ["word", "viMeaning"],
            },
          },
        },
        propertyOrdering: ["translations"],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Batch translate keywords to Vietnamese: Claude (primary) → Gemini (fallback)
 * Returns { result: { translations: [{word, viMeaning}] }, provider }
 */
export async function aiTranslateKeywords(keywords) {
  return withFallback(
    "keyword-translate",
    () => translateWithClaude(keywords),
    () => translateWithGemini(keywords),
  );
}
