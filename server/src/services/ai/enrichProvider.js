import { Type, claude, genai, withFallback } from "./client";

const PART_OF_SPEECH_VALUES = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "determiner",
  "pronoun",
  "noun_phrase",
  "verb_phrase",
  "adj_phrase",
  "adv_phrase",
  "prep_phrase",
  "phrasal_verb",
];

const CEFR_VALUES = ["A1", "A2", "B1", "B2", "C1", "C2"];

function buildContextBlock(context) {
  const { partOfSpeech, sentenceContext, level } = context;
  const lines = [
    partOfSpeech && `- Known part of speech: ${partOfSpeech}`,
    sentenceContext && `- Source sentence: "${sentenceContext}"`,
    level && `- Lesson level (hint for example difficulty): ${level}`,
  ].filter(Boolean);
  return lines.length > 0 ? `\nContext from caller:\n${lines.join("\n")}\n` : "";
}

export function buildEnrichPrompt(word, context = {}) {
  const contextBlock = buildContextBlock(context);

  return `You are an English-Vietnamese bilingual dictionary editor producing entries for a Vietnamese English-learning platform. Your output is persisted to a database and shown directly to learners — quality and consistency matter.

Word or phrase to enrich: "${word}"
${contextBlock}
═══════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════
Produce a structured dictionary entry with:
- IPA pronunciation (US, phonemic)
- Top-level partOfSpeech for the entry
- 1-4 distinct sense definitions ordered by USAGE FREQUENCY (most common first)
- Each definition has: CEFR level, English def, Vietnamese def, paired example, synonyms, antonyms

If the input is a multi-word phrase (phrasal verb, collocation, idiom):
- Treat it as a single unit; do not split
- IPA may be approximate or null if the phrase has no canonical IPA
- partOfSpeech reflects the function (e.g. "look forward to" → phrasal_verb;
  "give someone a tour" → verb_phrase; "intellectual rigor" → noun_phrase)
- Usually only 1 sense — do not pad

═══════════════════════════════════════════════════════════════
IPA FORMAT
═══════════════════════════════════════════════════════════════
- Wrap in slashes: /…/  (phonemic, NOT square brackets [])
- Use US pronunciation by default
- Use IPA stress marks: ˈ (primary), ˌ (secondary)
- No dot separators between syllables
- Examples: "/əˈpriːʃiˌeɪt/", "/ˈaʊtɪŋ/", "/ɔːlˈbiːɪt/"
- For multi-word phrases without canonical IPA, return null

═══════════════════════════════════════════════════════════════
partOfSpeech (top-level)
═══════════════════════════════════════════════════════════════
- Pick ONE PoS for the whole entry: the most common/dominant PoS for this word
- If a hint is provided in "Context from caller", USE THAT HINT
- Multi-word units: use phrasal_verb / verb_phrase / noun_phrase / adj_phrase /
  adv_phrase / prep_phrase as appropriate
- Single words: use the base PoS (noun/verb/adjective/adverb/...)
- All definitions in this entry must share this same PoS. If the word has
  meaningfully different PoS (e.g. "run" verb + noun), enrich the dominant
  PoS only. The caller will request a separate enrichment for the other PoS.

═══════════════════════════════════════════════════════════════
DEFINITIONS — ordering and distinctness
═══════════════════════════════════════════════════════════════
- Provide 1-4 definitions covering DISTINCT common senses
- Order by USAGE FREQUENCY in modern English (most common first), NOT by CEFR
- Each definition MUST represent a distinct sense
- If two candidate senses overlap >70%, MERGE into one broader definition
- DO NOT pad with rare or invented senses to reach 4
- Most words have 1-2 dominant senses; only complex words need 3-4
- Multi-word phrases usually have 1 sense — that's fine, return [1 def]

═══════════════════════════════════════════════════════════════
engDef format (English definition)
═══════════════════════════════════════════════════════════════
- Dictionary style — concise, lowercase first letter, NO trailing period
- Verb: "to [infinitive] [object/complement]"
   ✓ "to recognize the value of someone or something"
   ✗ "Recognize the value of something."  (capital + period)
   ✗ "the act of recognizing value"  (gerund noun phrase for verb)
- Noun: "a/the [noun phrase]" or "[concept]"
   ✓ "a short trip taken for pleasure or relaxation"
- Adjective: "[describing X]" or "showing/being [...]"
   ✓ "showing serious thought or attention to detail"
- Adverb: "in a [...] manner" or contextual
- Multi-word verb phrase: "to [pattern using someone/something]"
   ✓ "to give a guided visit of a place to someone"
- Length: under 20 words

═══════════════════════════════════════════════════════════════
viDef format (Vietnamese definition) — MATCH dictionary convention
═══════════════════════════════════════════════════════════════
- 1-3 short Vietnamese equivalents, semicolon-separated
- NO PoS marker (NEVER write "(v.)", "(n.)", "(adj.)" prefix)
- Optional context in parentheses for disambiguation
- Lowercase unless proper noun
- Examples:
   appreciate (B1)  → "đánh giá cao; trân trọng"
   appreciate (B2)  → "cảm kích; biết ơn"  (when context = thanks)
   appreciate (B2)  → "tăng giá trị (tài sản)"  (financial sense)
   look forward to  → "mong chờ; háo hức chờ đợi"
   bear in mind     → "ghi nhớ; lưu ý"
   the              → "(mạo từ xác định)"

═══════════════════════════════════════════════════════════════
example (English + Vietnamese pair)
═══════════════════════════════════════════════════════════════
engEx constraints:
- (A) Complete sentence with end punctuation, length 8-20 words
- (B) Concrete subject — "Sarah", "the team", "my brother", "the manager" —
      NOT bare "she/he/it" without antecedent
- (C) Show the TYPICAL usage pattern of THIS specific definition
- (D) Vocabulary used in the example must be at or below the definition's
      CEFR level (don't use C1 words to explain a B1 sense)
- (E) Different example for each definition — no overlap
- (F) For verb phrases with placeholder: keep the placeholder pattern visible
      ✓ "Sarah gave the new interns a tour of the office building."

viEx constraints:
- Natural Vietnamese translation matching engEx semantically
- Same length range (8-20 words equivalent)
- Use neutral "tôi/bạn" pronouns unless context suggests otherwise
- Match register of engEx (formal/casual)

═══════════════════════════════════════════════════════════════
synonyms / antonyms quality
═══════════════════════════════════════════════════════════════
- Match PoS of the headword (verb→verb, noun→noun, NEVER cross-PoS)
- Match this specific sense — NOT a different sense of the headword
- Match register (formal headword → formal synonym; informal → informal)
- Prefer specific, semantically close items over vague near-misses
- Lowercase, base form
- 0-5 synonyms; allow empty array if no good match — DO NOT force-fill
- 0-3 antonyms; allow empty array
- Multi-word phrases: usually no synonyms/antonyms — that's fine

═══════════════════════════════════════════════════════════════
CEFR level per definition
═══════════════════════════════════════════════════════════════
- Must be one of: A1, A2, B1, B2, C1, C2
- Reflects how advanced THIS specific sense is, not the headword overall
- Common rule of thumb:
   A1: super-basic everyday (hi, eat, big, family)
   A2: high-frequency content words (decide, useful, neighborhood)
   B1: common collocations, intermediate vocab (appreciate, look forward to)
   B2: nuanced vocab, common idioms (thoughtful, as a matter of fact)
   C1: academic, formal, sophisticated (albeit, notwithstanding)
   C2: rare, literary, highly specialized

═══════════════════════════════════════════════════════════════
SELF-CHECK BEFORE RETURNING
═══════════════════════════════════════════════════════════════
Walk through this checklist mentally:
[ ] IPA wrapped in /…/, US pronunciation (or null for phrases)
[ ] Top-level partOfSpeech set, matches caller hint if provided
[ ] All definitions share the same partOfSpeech as top-level
[ ] All viDef use ; separator, NO PoS markers like "(v.)"
[ ] All engDef in dictionary style (lowercase start, no period, infinitive prefix for verbs)
[ ] All examples 8-20 words, concrete subject, NOT generic "She is.../It has..."
[ ] Each example viEx semantically matches its engEx
[ ] CEFR is one of A1/A2/B1/B2/C1/C2
[ ] Definitions are DISTINCT senses, not paraphrases
[ ] Definitions ordered by USAGE FREQUENCY (most common first)
[ ] Synonyms/antonyms match PoS + this sense + register
[ ] No padding (don't reach 4 senses if word has only 1-2)
If any check fails → fix before returning.

═══════════════════════════════════════════════════════════════
WORKED EXAMPLE
═══════════════════════════════════════════════════════════════
For the word "appreciate" (verb), the IDEAL output:
{
  "ipa": "/əˈpriːʃiˌeɪt/",
  "partOfSpeech": "verb",
  "definitions": [
    {
      "definitionCefrLevel": "B1",
      "engDef": "to recognize the value of someone or something",
      "viDef": "đánh giá cao; trân trọng",
      "example": {
        "engEx": "Sarah really appreciates her team's hard work on this project.",
        "viEx": "Sarah thực sự đánh giá cao sự chăm chỉ của đội cô ấy trong dự án này."
      },
      "synonyms": ["value", "respect", "acknowledge"],
      "antonyms": ["disregard", "undervalue"]
    },
    {
      "definitionCefrLevel": "B2",
      "engDef": "to be grateful for something",
      "viDef": "cảm kích; biết ơn",
      "example": {
        "engEx": "I would appreciate it if you could reply by Friday.",
        "viEx": "Nếu bạn có thể trả lời trước thứ Sáu thì tôi rất cảm kích."
      },
      "synonyms": ["thank", "be grateful for"],
      "antonyms": []
    },
    {
      "definitionCefrLevel": "B2",
      "engDef": "to fully understand the nature or extent of something",
      "viDef": "hiểu rõ; nhận thức đầy đủ",
      "example": {
        "engEx": "Many tourists don't appreciate how dangerous the desert can be.",
        "viEx": "Nhiều du khách không nhận thức được sa mạc nguy hiểm thế nào."
      },
      "synonyms": ["understand", "grasp", "comprehend"],
      "antonyms": ["misunderstand"]
    },
    {
      "definitionCefrLevel": "B2",
      "engDef": "to increase in monetary value over time",
      "viDef": "tăng giá trị (tài sản)",
      "example": {
        "engEx": "The property has appreciated by 15% in the last year.",
        "viEx": "Bất động sản đã tăng giá 15% trong năm qua."
      },
      "synonyms": ["rise in value", "gain"],
      "antonyms": ["depreciate", "lose value"]
    }
  ]
}

For a multi-word phrase "bear in mind" (verb_phrase), the IDEAL output:
{
  "ipa": null,
  "partOfSpeech": "verb_phrase",
  "definitions": [
    {
      "definitionCefrLevel": "B2",
      "engDef": "to remember or take into consideration when making a decision",
      "viDef": "ghi nhớ; lưu ý; cân nhắc",
      "example": {
        "engEx": "Please bear in mind that the office will be closed next Monday.",
        "viEx": "Xin lưu ý rằng văn phòng sẽ đóng cửa thứ Hai tuần sau."
      },
      "synonyms": ["keep in mind", "remember", "consider"],
      "antonyms": ["overlook", "forget"]
    }
  ]
}

Now produce the entry for: "${word}"`;
}

const DEFINITION_INPUT_SCHEMA = {
  type: "object",
  properties: {
    definitionCefrLevel: { type: "string", enum: CEFR_VALUES },
    engDef: { type: "string", description: "Dictionary style English def — lowercase start, no period, under 20 words. Verbs use 'to ...' infinitive prefix." },
    viDef: { type: "string", description: "1-3 Vietnamese meanings, semicolon-separated, NO PoS marker. Optional context in parens." },
    example: {
      type: "object",
      properties: {
        engEx: { type: "string", description: "8-20 words, concrete subject, NOT generic. Shows typical usage of this specific sense." },
        viEx: { type: "string", description: "Natural Vietnamese matching engEx semantically." },
      },
      required: ["engEx", "viEx"],
    },
    synonyms: { type: "array", items: { type: "string" }, description: "0-5, same PoS + sense + register as headword. Empty if none." },
    antonyms: { type: "array", items: { type: "string" }, description: "0-3, same PoS + sense + register. Empty if none." },
  },
  required: ["definitionCefrLevel", "engDef", "viDef", "example", "synonyms", "antonyms"],
};

const ENRICH_INPUT_SCHEMA = {
  type: "object",
  properties: {
    ipa: { type: "string", description: "Phonemic IPA wrapped in /…/, US pronunciation. Use null for multi-word phrases without canonical IPA." },
    partOfSpeech: { type: "string", enum: PART_OF_SPEECH_VALUES, description: "Top-level PoS for the entry. All definitions share this PoS." },
    definitions: {
      type: "array",
      description: "1-4 distinct senses ordered by usage frequency (most common first). Multi-word phrases usually have 1 sense.",
      items: DEFINITION_INPUT_SCHEMA,
    },
  },
  required: ["partOfSpeech", "definitions"],
};

async function enrichWithClaude(word, context) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: buildEnrichPrompt(word, context) }],
    tools: [
      {
        name: "return_enrichment",
        description:
          "Return a structured dictionary entry: phonemic IPA (or null), top-level partOfSpeech, 1-4 distinct sense definitions ordered by usage frequency, each with dictionary-style engDef, semicolon-separated viDef, paired natural example, and PoS-matched synonyms/antonyms. All fields follow strict format conventions.",
        input_schema: ENRICH_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "return_enrichment" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function enrichWithGemini(word, context) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildEnrichPrompt(word, context),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          ipa: { type: Type.STRING, nullable: true },
          partOfSpeech: { type: Type.STRING, enum: PART_OF_SPEECH_VALUES },
          definitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                definitionCefrLevel: { type: Type.STRING, enum: CEFR_VALUES },
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
              propertyOrdering: [
                "definitionCefrLevel",
                "engDef",
                "viDef",
                "example",
                "synonyms",
                "antonyms",
              ],
            },
          },
        },
        propertyOrdering: ["ipa", "partOfSpeech", "definitions"],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Enrich word: Claude (primary) → Gemini (fallback)
 * @param {string} word - English word or multi-word phrase
 * @param {object} [context]
 * @param {string} [context.partOfSpeech] - PoS hint from caller (e.g. from preview output)
 * @param {string} [context.sentenceContext] - source sentence for sense disambiguation
 * @param {string} [context.level] - lesson level hint for example difficulty
 */
export async function aiEnrichWord(word, context = {}) {
  return withFallback(
    "enrich",
    () => enrichWithClaude(word, context),
    () => enrichWithGemini(word, context),
  );
}
