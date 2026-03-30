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

const PREVIEW_PROMPT = (paragraph, context = {}) => {
  const { type, contentType, topic, title, level, description } = context;

  const contextLines = [
    type && `- Writing type: ${type}`,
    contentType && `- Content type: ${contentType} (this affects tone: email=formal, diary=casual, essay=academic, etc.)`,
    level && `- Student level: ${level} (beginner=simple vocabulary & short sentences, intermediate=moderate complexity, advanced=rich vocabulary & complex structures)`,
    topic && `- Topic: ${topic.replace(/_/g, " ")}`,
    title && `- Lesson title: "${title}"`,
    description && `- Description: "${description}"`,
  ].filter(Boolean);

  const contextBlock = contextLines.length > 0
    ? `\nLesson context:\n${contextLines.join("\n")}\n`
    : "";

  return `You are an English-Vietnamese translation expert for an English learning platform.
${contextBlock}
Given the following English paragraph, you must:
1. Create a complete Vietnamese translation of the ENTIRE paragraph (vietnameseParagraph) that:
   - Preserves the EXACT same formatting: line breaks, paragraph breaks, commas, punctuation style
   - Reads naturally and fluently as a cohesive Vietnamese text
   - Matches the tone and context of the original${contentType ? ` (this is a ${contentType})` : ""}
${level ? `   - Use vocabulary appropriate for ${level} learners in the Vietnamese translation` : ""}
2. Split into individual sentences and for each sentence:
   - Provide the Vietnamese translation (must match the corresponding part in vietnameseParagraph)
   - Extract 3-5 key vocabulary words/phrases with Vietnamese meanings and English example sentences
   - Add a brief grammar/vocabulary note in Vietnamese if relevant${level ? ` (suitable for ${level} level)` : ""}

Rules:
- Split at natural sentence boundaries (., !, ?, but NOT abbreviations like Mr., Dr., U.S.)
- Keep each sentence as a complete, standalone unit
- The vietnameseParagraph MUST have the same line breaks and paragraph structure as the original English
- Each sentence's vietnameseText must be consistent with the vietnameseParagraph (same wording)
${level === "beginner" ? "- For vocabulary: focus on common, high-frequency words that beginners need to learn\n- For explanations: keep grammar notes simple and clear" : ""}${level === "intermediate" ? "- For vocabulary: include both common words and useful collocations/phrases\n- For explanations: include grammar patterns and usage notes" : ""}${level === "advanced" ? "- For vocabulary: focus on nuanced expressions, idioms, and sophisticated vocabulary\n- For explanations: include advanced grammar points, register differences, and stylistic notes" : ""}
- Vocabulary extraction rules (CRITICAL — follow strictly):

  FORMAT RULES:
  - Always use base/infinitive forms: "hope" not "hoped", "appreciate" not "appreciated", "brighten" not "brightened"
  - For verb phrases with typical objects, use "someone/something" as placeholder: "give someone a tour", "brighten someone's day", "remind someone of something"
  - Lowercase all entries unless proper noun

  MUST EXTRACT (good examples):
  - Single words: nouns (gift, generosity, thoughtfulness), verbs (appreciate, visit, brighten), adjectives (wonderful, perfect, cute), adverbs (really, soon)
  - Phrasal verbs: "look forward to", "find out", "come across", "get along with"
  - Verb phrases with object pattern: "give someone a tour", "brighten someone's day", "take care of", "mean a lot to someone"
  - Collocations: "make a decision", "pay attention", "best wishes", "once again"
  - Adjective + preposition: "perfect for", "interested in", "excited about"
  - Set phrases/idioms: "once again", "as a matter of fact", "on the other hand"
  - Polite structures (WITHOUT subject): "would like to", "would love to"

  MUST NOT EXTRACT (bad examples):
  - Subject + verb: "I hope" → extract "hope"; "I appreciate" → extract "appreciate"; "you know" → extract "know"
  - Subject + adverb + verb: "I really love" → extract "love" and "really" separately
  - Random word pairs that aren't collocations: "new office" (not a set phrase), "this gift" (demonstrative + noun)
  - Sentence fragments: "It was such a", "How did you know I"
  - Proper nouns alone: "Emily", "Michael" (unless teaching name conventions)
  - Articles/determiners alone: "the", "a", "this", "my"
  - Function words: "and", "but", "or", "that", "which"
  - Full clauses: "I want to thank you for" → extract "thank someone for"

  EDGE CASES:
  - "Dear" in letter context → extract as word (it's a greeting convention worth learning)
  - "Best wishes" → extract as noun_phrase (set closing phrase)
  - "How did you know" → extract "know" as verb, NOT the full question
  - "It's perfect for" → extract "perfect for" as adj_phrase (drop "It's")
  - "I would love to see you again" → extract "would love to" as verb_phrase AND "see someone again" as verb_phrase

Paragraph:
${paragraph.trim()}`;
};

async function previewWithClaude(paragraph, context) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: PREVIEW_PROMPT(paragraph, context) }],
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

async function previewWithGemini(paragraph, context) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: PREVIEW_PROMPT(paragraph, context),
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
export async function aiPreviewWriting(paragraph, context = {}) {
  return withFallback(
    "preview",
    () => previewWithClaude(paragraph, context),
    () => previewWithGemini(paragraph, context),
  );
}
