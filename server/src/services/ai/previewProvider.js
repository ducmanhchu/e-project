import { Type, claude, genai, withFallback } from "./client";

const PART_OF_SPEECH_VALUES = [
  "word",
  "noun_phrase",
  "verb_phrase",
  "adj_phrase",
  "adv_phrase",
  "prep_phrase",
  "phrasal_verb",
];

const PREVIEW_PROMPT = (paragraph) =>
  `You are an English-Vietnamese translation expert for an English learning platform.

Given the following English paragraph, you must:
1. Create a complete Vietnamese translation of the ENTIRE paragraph (vietnameseParagraph) that:
   - Preserves the EXACT same formatting: line breaks, paragraph breaks, commas, punctuation style
   - Reads naturally and fluently as a cohesive Vietnamese text
   - Matches the tone and context of the original (formal letter, casual email, etc.)
2. Split into individual sentences and for each sentence:
   - Provide the Vietnamese translation (must match the corresponding part in vietnameseParagraph)
   - Extract 3-5 key vocabulary words/phrases with Vietnamese meanings and English example sentences
   - Add a brief grammar/vocabulary note in Vietnamese if relevant

Rules:
- Split at natural sentence boundaries (., !, ?, but NOT abbreviations like Mr., Dr., U.S.)
- Keep each sentence as a complete, standalone unit
- The vietnameseParagraph MUST have the same line breaks and paragraph structure as the original English
- Each sentence's vietnameseText must be consistent with the vietnameseParagraph (same wording)
- For vocabulary, pick words/phrases that Vietnamese learners would find useful

Paragraph:
${paragraph.trim()}`;

async function previewWithClaude(paragraph) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: PREVIEW_PROMPT(paragraph) }],
    tools: [
      {
        name: "return_preview",
        description:
          "Return the structured preview result with sentences and vocabulary",
        input_schema: {
          type: "object",
          properties: {
            vietnameseParagraph: {
              type: "string",
              description:
                "Complete Vietnamese translation of the entire paragraph, preserving exact line breaks, paragraph breaks, and formatting of the original English text",
            },
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  referenceAnswer: {
                    type: "string",
                    description: "The original English sentence",
                  },
                  vietnameseText: {
                    type: "string",
                    description:
                      "Vietnamese translation of the sentence (must be consistent with vietnameseParagraph)",
                  },
                  explanation: {
                    type: "string",
                    description:
                      "Brief grammar/vocabulary note in Vietnamese (empty string if none)",
                  },
                  vocabulary: {
                    type: "array",
                    description: "3-5 key vocabulary items from this sentence",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string" },
                        partOfSpeech: {
                          type: "string",
                          enum: PART_OF_SPEECH_VALUES,
                        },
                        meaning: {
                          type: "string",
                          description: "Vietnamese meaning",
                        },
                        example: {
                          type: "string",
                          description: "English example sentence",
                        },
                      },
                      required: ["word", "partOfSpeech", "meaning", "example"],
                    },
                  },
                },
                required: [
                  "referenceAnswer",
                  "vietnameseText",
                  "explanation",
                  "vocabulary",
                ],
              },
            },
          },
          required: ["vietnameseParagraph", "results"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_preview" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return {
    vietnameseParagraph: toolBlock.input.vietnameseParagraph,
    results: toolBlock.input.results,
  };
}

async function previewWithGemini(paragraph) {
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: PREVIEW_PROMPT(paragraph),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          vietnameseParagraph: {
            type: Type.STRING,
            description:
              "Complete Vietnamese translation preserving original formatting",
          },
          results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                referenceAnswer: { type: Type.STRING },
                vietnameseText: { type: Type.STRING },
                explanation: { type: Type.STRING },
                vocabulary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      partOfSpeech: { type: Type.STRING, enum: PART_OF_SPEECH_VALUES },
                      meaning: { type: Type.STRING },
                      example: { type: Type.STRING },
                    },
                    propertyOrdering: ["word", "partOfSpeech", "meaning", "example"],
                  },
                },
              },
              propertyOrdering: ["referenceAnswer", "vietnameseText", "explanation", "vocabulary"],
            },
          },
        },
        propertyOrdering: ["vietnameseParagraph", "results"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  return {
    vietnameseParagraph: parsed.vietnameseParagraph,
    results: parsed.results,
  };
}

/**
 * Preview writing: Claude (primary) → Gemini (fallback)
 */
export async function aiPreviewWriting(paragraph) {
  return withFallback(
    "preview",
    () => previewWithClaude(paragraph),
    () => previewWithGemini(paragraph),
  );
}
