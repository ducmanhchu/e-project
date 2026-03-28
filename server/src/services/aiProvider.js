import { Type } from "@google/genai";
import { claude } from "@server/config/claude";
import { genai } from "@server/config/gemini";

const PREVIEW_PROMPT = (paragraph) =>
  `You are an English-Vietnamese translation expert for an English learning platform.

Given the following English paragraph, split it into individual sentences and for each sentence:
1. Translate it naturally into Vietnamese
2. Extract 3-5 key vocabulary words/phrases with Vietnamese meanings and English example sentences
3. Add a brief grammar/vocabulary note in Vietnamese if relevant

Rules:
- Split at natural sentence boundaries (., !, ?, but NOT abbreviations like Mr., Dr., U.S.)
- Keep each sentence as a complete, standalone unit
- Translate naturally and accurately into Vietnamese
- For vocabulary, pick words/phrases that Vietnamese learners would find useful

Paragraph:
${paragraph.trim()}`;

const PART_OF_SPEECH_VALUES = [
  "word",
  "noun_phrase",
  "verb_phrase",
  "adj_phrase",
  "adv_phrase",
  "prep_phrase",
  "phrasal_verb",
];

/**
 * Claude (primary) — dùng tool_use để đảm bảo structured JSON output
 */
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
                    description: "Vietnamese translation of the sentence",
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
          required: ["results"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_preview" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input.results;
}

/**
 * Gemini (fallback) — dùng responseJsonSchema cho structured output
 */
async function previewWithGemini(paragraph) {
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: PREVIEW_PROMPT(paragraph),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            referenceAnswer: {
              type: Type.STRING,
              description: "The original English sentence",
            },
            vietnameseText: {
              type: Type.STRING,
              description: "Vietnamese translation of the sentence",
            },
            explanation: {
              type: Type.STRING,
              description:
                "Brief grammar/vocabulary note in Vietnamese (empty string if none)",
            },
            vocabulary: {
              type: Type.ARRAY,
              description: "3-5 key vocabulary items from this sentence",
              items: {
                type: Type.OBJECT,
                properties: {
                  word: {
                    type: Type.STRING,
                    description: "The English word or phrase",
                  },
                  partOfSpeech: {
                    type: Type.STRING,
                    description: "Part of speech category",
                    enum: PART_OF_SPEECH_VALUES,
                  },
                  meaning: {
                    type: Type.STRING,
                    description: "Vietnamese meaning",
                  },
                  example: {
                    type: Type.STRING,
                    description: "English example sentence",
                  },
                },
                propertyOrdering: ["word", "partOfSpeech", "meaning", "example"],
              },
            },
          },
          propertyOrdering: [
            "referenceAnswer",
            "vietnameseText",
            "explanation",
            "vocabulary",
          ],
        },
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Preview writing: Claude (primary) → Gemini (fallback)
 * Trả về cùng format cho cả 2 provider
 */
export async function aiPreviewWriting(paragraph) {
  try {
    const parsed = await previewWithClaude(paragraph);
    return { parsed, provider: "claude" };
  } catch (err) {
    console.warn("[AI] Claude failed, falling back to Gemini:", err.message);
    const parsed = await previewWithGemini(paragraph);
    return { parsed, provider: "gemini" };
  }
}

// ──────────────────────────────────────────────
// AI Grading for reverse_translation exercise
// ──────────────────────────────────────────────

const GRADING_PROMPT = (userAnswer, referenceAnswer, vietnameseText) =>
  `You are an English writing evaluator for a Vietnamese learner practicing reverse translation.

Vietnamese sentence: "${vietnameseText}"
Reference English answer: "${referenceAnswer}"
Student's answer: "${userAnswer}"

Evaluate the student's translation and give:
1. A score from 0-100 (100 = perfect match in meaning and grammar)
2. A brief summary in Vietnamese (1 sentence)
3. 1-2 specific strengths (in Vietnamese)
4. 1-2 specific improvements if score < 100 (in Vietnamese), empty array if perfect

Scoring guide:
- 90-100: Excellent, meaning and grammar both correct
- 70-89: Good, minor errors that don't affect meaning
- 50-69: Acceptable, meaning preserved but notable grammar/vocab issues
- Below 50: Needs improvement, meaning not fully conveyed`;

const GRADING_SCHEMA = {
  score: { type: "number", description: "Score from 0 to 100" },
  summary: {
    type: "string",
    description: "Brief evaluation summary in Vietnamese (1 sentence)",
  },
  strengths: {
    type: "array",
    items: { type: "string" },
    description: "1-2 specific strengths in Vietnamese",
  },
  improvements: {
    type: "array",
    items: { type: "string" },
    description:
      "1-2 specific improvements in Vietnamese, empty array if perfect",
  },
};

async function gradeWithClaude(userAnswer, referenceAnswer, vietnameseText) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: GRADING_PROMPT(userAnswer, referenceAnswer, vietnameseText),
      },
    ],
    tools: [
      {
        name: "return_grading",
        description: "Return the grading result",
        input_schema: {
          type: "object",
          properties: GRADING_SCHEMA,
          required: ["score", "summary", "strengths", "improvements"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_grading" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function gradeWithGemini(userAnswer, referenceAnswer, vietnameseText) {
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: GRADING_PROMPT(userAnswer, referenceAnswer, vietnameseText),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        propertyOrdering: ["score", "summary", "strengths", "improvements"],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Grade answer: Claude (primary) → Gemini (fallback)
 */
export async function aiGradeAnswer(
  userAnswer,
  referenceAnswer,
  vietnameseText,
) {
  try {
    const result = await gradeWithClaude(
      userAnswer,
      referenceAnswer,
      vietnameseText,
    );
    return { result, provider: "claude" };
  } catch (err) {
    console.warn(
      "[AI] Claude grading failed, falling back to Gemini:",
      err.message,
    );
    const result = await gradeWithGemini(
      userAnswer,
      referenceAnswer,
      vietnameseText,
    );
    return { result, provider: "gemini" };
  }
}
