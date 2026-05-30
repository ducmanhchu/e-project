import { Type, claude, genai, withFallback } from "@server/services/ai/client";
import { LEVEL_BAND } from "@server/services/ai/levelBand";

function buildContextBlock(context) {
  const { type, contentType, topic, title, level, description } = context;

  const lines = [
    type && `- Writing type: ${type}`,
    contentType && `- Content type: ${contentType} (tone hint)`,
    level &&
      `- Student level: ${level} (${LEVEL_BAND[level] ?? "unspecified band"})`,
    topic && `- Topic: ${topic.replace(/_/g, " ")}`,
    title && `- Lesson title: "${title}"`,
    description && `- Description: "${description}"`,
  ].filter(Boolean);

  return lines.length > 0 ? `\nLesson context:\n${lines.join("\n")}\n` : "";
}

export function buildTranslatePrompt(paragraph, context = {}) {
  const contextBlock = buildContextBlock(context);

  return `Role: You are a professional English-to-Vietnamese translator
      specializing in educational content.
${contextBlock}
Task:
1. Translate the entire English paragraph into natural Vietnamese.
2. Split the English paragraph into individual sentences.
3. Provide a per-sentence Vietnamese translation that EXACTLY matches
   the corresponding part of the full Vietnamese translation.

Translation quality rules:
- Preserve formatting EXACTLY: line breaks, paragraph breaks, punctuation,
  list markers, quotation style.
- Read naturally as cohesive Vietnamese — not literal word-by-word.
- Match register based on contentType:
    email   → polite, structured (use "ạ" for formal recipients)
    diary   → casual, first-person reflective
    essay   → academic, neutral
    article → informative, journalistic
    story   → narrative, descriptive
    report  → formal, factual
    general → neutral
- Pronouns: pick contextually appropriate Vietnamese pronouns based on
  relationship hints in the text. If unclear, default to neutral
  "tôi/bạn" pair. Do NOT switch pronouns mid-text.
- Tense markers (đã/đang/sẽ): include only when needed for clarity.
  Don't pad every Vietnamese sentence with "đã" just because English is past tense.
- Proper nouns: keep original spelling (Emily stays "Emily", not transliterate).
  Place names: keep English (London, New York) unless commonly Vietnamized
  (Anh Quốc, Mỹ).
- Idioms: translate the meaning, not literally.

Sentence splitting rules:
- Split at . ! ? — but NOT at abbreviations (Mr., Dr., U.S., e.g., i.e., etc.)
- Each sentence must be a complete standalone unit
- Include trailing punctuation in the sentence
- Keep direct speech intact: "Hello," she said. → 1 sentence

Consistency rule:
- For each sentence: vietnameseText[i] must appear within
  vietnameseParagraph (concatenating sentences must reconstruct
  vietnameseParagraph).

Self-check before returning:
- [ ] vietnameseParagraph preserves original line breaks
- [ ] sentences.length matches the number of English sentences
- [ ] Concatenation of vietnameseText[] reconstructs vietnameseParagraph
- [ ] Pronouns are consistent across sentences
- [ ] No untranslated English words leak into Vietnamese (except proper nouns)

EXAMPLE:
Input: "Hi Sarah,\\n\\nThanks again for the gift! It's perfect."
Output: {
  "vietnameseParagraph": "Chào Sarah,\\n\\nCảm ơn bạn lần nữa vì món quà! Nó rất tuyệt.",
  "sentences": [
    {"referenceAnswer": "Hi Sarah,", "vietnameseText": "Chào Sarah,"},
    {"referenceAnswer": "Thanks again for the gift!", "vietnameseText": "Cảm ơn bạn lần nữa vì món quà!"},
    {"referenceAnswer": "It's perfect.", "vietnameseText": "Nó rất tuyệt."}
  ]
}

Paragraph:
${paragraph.trim()}`;
}

const TRANSLATE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    vietnameseParagraph: {
      type: "string",
      description:
        "Complete Vietnamese translation of the entire paragraph, preserving exact line breaks, paragraph breaks, and formatting.",
    },
    sentences: {
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
        },
        required: ["referenceAnswer", "vietnameseText"],
      },
    },
  },
  required: ["vietnameseParagraph", "sentences"],
};

async function translateWithClaude(paragraph, context) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      { role: "user", content: buildTranslatePrompt(paragraph, context) },
    ],
    tools: [
      {
        name: "return_translation",
        description:
          "Return the structured Vietnamese translation with a sentence-aligned breakdown.",
        input_schema: TRANSLATE_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "return_translation" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return {
    vietnameseParagraph: toolBlock.input.vietnameseParagraph,
    sentences: toolBlock.input.sentences,
  };
}

async function translateWithGemini(paragraph, context) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildTranslatePrompt(paragraph, context),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          vietnameseParagraph: { type: Type.STRING },
          sentences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                referenceAnswer: { type: Type.STRING },
                vietnameseText: { type: Type.STRING },
              },
              propertyOrdering: ["referenceAnswer", "vietnameseText"],
            },
          },
        },
        propertyOrdering: ["vietnameseParagraph", "sentences"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  return {
    vietnameseParagraph: parsed.vietnameseParagraph,
    sentences: parsed.sentences,
  };
}

export async function aiTranslateParagraph(paragraph, context = {}) {
  return withFallback(
    "translate",
    () => translateWithClaude(paragraph, context),
    () => translateWithGemini(paragraph, context),
  );
}
