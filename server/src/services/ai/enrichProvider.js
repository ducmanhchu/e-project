import { Type, claude, genai, withFallback } from "./client";

const ENRICH_PROMPT = (word) =>
  `You are an English dictionary expert for Vietnamese learners.

Given the English word or phrase: "${word}"

Provide:
1. IPA phonetic transcription
2. Up to 3 definitions (each with: partOfSpeech, English definition, example sentence using the word)
3. Up to 5 synonyms
4. Up to 3 antonyms (empty array if none apply)
5. Up to 5 related words (words commonly used together or in similar contexts)

Keep definitions clear and suitable for intermediate English learners.`;

const ENRICH_SCHEMA_PROPS = {
  phonetic: { type: "string", description: "IPA phonetic transcription" },
  definitions: {
    type: "array",
    items: {
      type: "object",
      properties: {
        partOfSpeech: { type: "string" },
        definition: { type: "string", description: "English definition" },
        example: { type: "string", description: "Example sentence" },
      },
      required: ["partOfSpeech", "definition", "example"],
    },
  },
  synonyms: { type: "array", items: { type: "string" } },
  antonyms: { type: "array", items: { type: "string" } },
  relatedWords: { type: "array", items: { type: "string" } },
};

async function enrichWithClaude(word) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: ENRICH_PROMPT(word) }],
    tools: [
      {
        name: "return_enrichment",
        description: "Return enriched word data",
        input_schema: {
          type: "object",
          properties: ENRICH_SCHEMA_PROPS,
          required: ["phonetic", "definitions", "synonyms", "antonyms", "relatedWords"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_enrichment" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function enrichWithGemini(word) {
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: ENRICH_PROMPT(word),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          phonetic: { type: Type.STRING },
          definitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partOfSpeech: { type: Type.STRING },
                definition: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              propertyOrdering: ["partOfSpeech", "definition", "example"],
            },
          },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
          relatedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        propertyOrdering: ["phonetic", "definitions", "synonyms", "antonyms", "relatedWords"],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Enrich word: Claude (primary) → Gemini (fallback)
 */
export async function aiEnrichWord(word) {
  return withFallback(
    "enrich",
    () => enrichWithClaude(word),
    () => enrichWithGemini(word),
  );
}
