import { Type, claude, genai, withFallback } from "./client";

const ENRICH_PROMPT = (word) =>
  `You are an English dictionary expert for Vietnamese learners.

Given the English word or phrase: "${word}"

Provide:
1. IPA phonetic transcription
2. Up to 4 definitions, each with:
   - CEFR level (A1, A2, B1, B2, C1, C2)
   - English definition
   - Vietnamese definition
   - Example sentence in English and Vietnamese translation
   - Up to 5 synonyms (empty array if none)
   - Up to 3 antonyms (null if none apply)

Order definitions from most common/basic (A1/A2) to advanced (B2/C1).
Keep definitions clear and suitable for Vietnamese learners of English.`;

const DEFINITION_SCHEMA_PROPS = {
  definitionCefrLevel: { type: "string", description: "CEFR level: A1, A2, B1, B2, C1, C2" },
  engDef: { type: "string", description: "English definition" },
  viDef: { type: "string", description: "Vietnamese definition" },
  example: {
    type: "object",
    properties: {
      engEx: { type: "string", description: "Example sentence in English" },
      viEx: { type: "string", description: "Example sentence in Vietnamese" },
    },
    required: ["engEx", "viEx"],
  },
  synonyms: { type: "array", items: { type: "string" } },
  antonyms: { type: "array", items: { type: "string" }, nullable: true },
};

const ENRICH_SCHEMA_PROPS = {
  ipa: { type: "string", description: "IPA phonetic transcription" },
  definitions: {
    type: "array",
    items: {
      type: "object",
      properties: DEFINITION_SCHEMA_PROPS,
      required: ["definitionCefrLevel", "engDef", "viDef", "example"],
    },
  },
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
          required: ["ipa", "definitions"],
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
    model: "gemini-2.5-flash",
    contents: ENRICH_PROMPT(word),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          ipa: { type: Type.STRING },
          definitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                definitionCefrLevel: { type: Type.STRING },
                engDef: { type: Type.STRING },
                viDef: { type: Type.STRING },
                example: {
                  type: Type.OBJECT,
                  properties: {
                    engEx: { type: Type.STRING },
                    viEx: { type: Type.STRING },
                  },
                  propertyOrdering: ["engEx", "viEx"],
                },
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              propertyOrdering: ["definitionCefrLevel", "engDef", "viDef", "example", "synonyms", "antonyms"],
            },
          },
        },
        propertyOrdering: ["ipa", "definitions"],
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
