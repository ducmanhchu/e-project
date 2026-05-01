import { Type, claude, genai, withFallback } from "@server/services/ai/client";
import { LEVEL_BAND } from "@server/services/ai/levelBand";

export const PART_OF_SPEECH_VALUES = [
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

const VOCAB_INPUT_SCHEMA = {
  type: "object",
  properties: {
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          partOfSpeech: { type: "string", enum: PART_OF_SPEECH_VALUES },
          meaning: {
            type: "string",
            description:
              "1-3 Vietnamese meanings, semicolon-separated, no PoS marker. Optional context in parentheses.",
          },
          example: {
            type: "string",
            description:
              "Standalone English sentence (8-20 words). MUST NOT be a copy of the source sentence. Concrete subject preferred.",
          },
          sentenceIndex: {
            type: "integer",
            minimum: 0,
            description: "0-based index into input sentences",
          },
        },
        required: [
          "word",
          "partOfSpeech",
          "meaning",
          "example",
          "sentenceIndex",
        ],
      },
    },
  },
  required: ["vocabulary"],
};

export function buildVocabExtractPrompt(sentences, context = {}) {
  const contextBlock = buildContextBlock(context);
  const sentenceList = sentences
    .map((s, i) => `[${s.index ?? i}] ${s.text}`)
    .join("\n");

  return `Role: You are a vocabulary curator for an English learning platform
      serving Vietnamese learners. Your job is to select HIGH-VALUE
      vocabulary items from English text — not catalog every word.
${contextBlock}
PRIMARY DIRECTIVE — quality over quantity:
You may return an EMPTY array if nothing meets the level threshold.
A focused list of 8-12 high-value items beats a padded list of 25.
Filler items waste the learner's attention.

═══════════════════════════════════════════════════════════════
LEVEL TARGETS (extract ONLY within this band):
═══════════════════════════════════════════════════════════════

[beginner] CEFR A1-A2 / IELTS 3.0-4.5
  TARGET BAND: pure A2 (e.g. decide, neighborhood, favorite, exciting,
                              borrow, useful, polite, friendly,
                              hungry, tired, careful)
  HARD CEILING: do NOT extract any word at B1 or above
  HARD FLOOR:   do NOT extract A1 basics (see stoplist)
  TOTAL CAP:    8-12 items per paragraph (HARD MAX 15)

[intermediate] CEFR B1-B2 / IELTS 5.0-6.5
  TARGET BAND: B1-B2 (e.g. appreciate, thoughtful, look forward to,
                            make a decision, come up with, eventually,
                            as a matter of fact, perfect for)
  HARD CEILING: avoid C1+ academic/literary terms
  HARD FLOOR:   skip A1-A2 everyday basics
  TOTAL CAP:    10-15 items per paragraph (HARD MAX 18)

[advanced] CEFR C1-C2 / IELTS 7.0+
  TARGET BAND: B2-C1+ (e.g. thoughtfulness, discerning, by no means,
                             give rise to, in light of, bear in mind,
                             albeit, notwithstanding)
  HARD CEILING: none (full nuance allowed)
  HARD FLOOR:   skip everything ≤B1, including basic phrasal verbs
                (look up, find out, get up, take off, put on)
  TOTAL CAP:    12-18 items per paragraph (HARD MAX 22)

═══════════════════════════════════════════════════════════════
STOPLIST — NEVER EXTRACT (regardless of level):
═══════════════════════════════════════════════════════════════
- Greetings: hi, hello, hey, bye, goodbye, good morning, good night
- Politeness: please, thanks, thank you, sorry, excuse me, you're welcome
- Yes/no/ok: yes, no, ok, okay, sure, maybe
- Pronouns: I, you, he, she, it, we, they, me, him, her, us, them,
            my, your, his, her, our, their
- Aux be/have/do (when auxiliary): am, is, are, was, were, has, had, does, did
- Standalone numbers, days of the week, months, basic colors
- Standalone basic prepositions used literally: in, on, at, with, for, of
  (EXCEPTION: when part of a phrasal verb or adj+prep collocation, e.g.,
   "interested in" or "look forward to" — extract the WHOLE phrase)
- Articles/determiners: the, a, an, this, that, these, those
- Conjunctions: and, but, or, so, because, although
- Override: if topic="personal_communication" AND title/description
  explicitly indicates teaching greetings, the greetings carve-out applies.

═══════════════════════════════════════════════════════════════
WHAT TO EXTRACT (ranked by pedagogical value):
═══════════════════════════════════════════════════════════════
1. Phrasal verbs: "look forward to", "come up with", "find out"
   → tag: phrasal_verb
2. Verb phrases with object pattern: "give someone a tour",
   "brighten someone's day", "take care of someone"
   → tag: verb_phrase
3. Set collocations: "make a decision", "pay attention", "best wishes"
   → tag: noun_phrase or verb_phrase
4. Adj+prep patterns: "interested in", "perfect for", "afraid of"
   → tag: adj_phrase
5. Adverbial phrases: "as soon as possible", "once again", "by the way"
   → tag: adv_phrase
6. Idioms / set expressions: "as a matter of fact", "on the other hand"
   → tag: by base PoS
7. Single content words at target band: appreciate, decisive,
   thoughtful, eventually, frankly
   → tag: noun/verb/adjective/adverb

═══════════════════════════════════════════════════════════════
NORMALIZATION RULES:
═══════════════════════════════════════════════════════════════
- Always base form: "appreciated" → "appreciate"; "noisier" → "noisy"
- Verb phrases use "someone/something" placeholders:
   "I gave Mary a tour" → extract "give someone a tour"
   "It brightened my day" → extract "brighten someone's day"
- Lowercase unless proper noun (Dear in letter context stays "dear")
- Strip subjects/objects from extraction:
   "I appreciate" → "appreciate"
   "you know" → "know"
   "I would love to see you again" → extract "would love to" + "see someone again"
- Strip articles when not part of set phrase:
   "make a decision" → keep "a" (set collocation)
   "the office" → strip → "office" (just a noun)

═══════════════════════════════════════════════════════════════
DEDUPLICATION:
═══════════════════════════════════════════════════════════════
- Each word/phrase appears AT MOST ONCE in the entire output
- If same word appears in 3 sentences, pick the sentence where it's most
  meaningful for learning, set sentenceIndex to that one
- "appreciate" and "appreciation" are different lemmas → both allowed
  if both add value, but prefer the one that better fits the level

═══════════════════════════════════════════════════════════════
partOfSpeech DISAMBIGUATION (prefer more specific tag):
═══════════════════════════════════════════════════════════════
- Multi-word verb + particle/preposition where the preposition CHANGES
  MEANING → phrasal_verb (look up = research)
- Multi-word verb + complement where meaning is literal/compositional
  → verb_phrase ("give someone a tour")
- Multi-word units functioning as adjective → adj_phrase
- Multi-word units functioning as adverb → adv_phrase
- Multi-word noun units → noun_phrase ("best wishes", "common sense")
- Single words use base PoS: noun/verb/adjective/adverb/preposition/conjunction
- When ambiguous: pick the MORE SPECIFIC tag

═══════════════════════════════════════════════════════════════
meaning FIELD FORMAT (match dictionary convention):
═══════════════════════════════════════════════════════════════
- 1-3 short Vietnamese equivalents, semicolon-separated
- NO PoS marker (no "(v.)", "(n.)")
- Optional context in parentheses for disambiguation
- Lowercase unless proper noun
- Examples:
   appreciate     → "đánh giá cao; trân trọng"
   appreciate     → "cảm kích; biết ơn"  (when context = thanks)
   appreciate     → "tăng giá trị (tài sản)"  (when context = finance)
   look forward to → "mong chờ; háo hức chờ đợi"
   the            → "(mạo từ xác định)"
- Pick the meaning that fits the SOURCE SENTENCE's context, not the
  most common general meaning.

═══════════════════════════════════════════════════════════════
example FIELD CONSTRAINTS:
═══════════════════════════════════════════════════════════════
- (A) MUST NOT copy or paraphrase the source sentence — learner already
      saw that one. Different context required.
- (B) Complete standalone sentence with end punctuation
- (C) Length 8-20 words
- (D) Different surrounding context from source — if source is an email,
      example can be a workplace/travel/everyday scenario
- (E) Vocabulary used in example must be at or below the lesson level
      (don't use C1 words to explain a B1 word)
- (F) Use a concrete subject when possible — "Sarah", "the team",
      "my brother" — not vague "she/he/it" without antecedent.

═══════════════════════════════════════════════════════════════
SELF-CHECK BEFORE RETURNING:
═══════════════════════════════════════════════════════════════
Walk through this checklist mentally:
[ ] Did I exceed the HARD MAX cap for this level?
[ ] Any duplicates in my list?
[ ] Any A1 stoplist items leaked in?
[ ] Any item above the level's HARD CEILING?
[ ] Any example sentence that's a copy of the source?
[ ] All "meaning" follow the dictionary convention (no PoS marker)?
[ ] All "word" in base form, lowercase, with someone/something for verb phrases?
[ ] Each sentenceIndex points to a real sentence in input?
If any check fails → fix before returning.

EXAMPLE — for an intermediate email paragraph
"Hi Sarah, Thanks again for the gift! It's perfect. I really appreciate
you remembering my birthday. Would love to catch up soon."
the IDEAL output:
{
  "vocabulary": [
    {"word": "appreciate", "partOfSpeech": "verb",
     "meaning": "cảm kích; biết ơn",
     "example": "I appreciate the manager's quick response to my request.",
     "sentenceIndex": 3},
    {"word": "perfect", "partOfSpeech": "adjective",
     "meaning": "hoàn hảo; rất phù hợp",
     "example": "This jacket is perfect for cold weather.",
     "sentenceIndex": 2},
    {"word": "would love to", "partOfSpeech": "verb_phrase",
     "meaning": "rất muốn; mong được",
     "example": "I would love to visit Japan someday.",
     "sentenceIndex": 4},
    {"word": "catch up", "partOfSpeech": "phrasal_verb",
     "meaning": "gặp lại để cập nhật tin tức; ôn chuyện cũ",
     "example": "Let's catch up over coffee next weekend.",
     "sentenceIndex": 4}
  ]
}

Notice what was SKIPPED: hi (greeting), Sarah (proper noun), thanks
(politeness), again (A2, below intermediate), for (basic prep), the gift
(article+noun), remembering (form of A2 word), birthday (A2), soon (A1).
4 high-value items from 5 sentences = focused, not padded.

═══════════════════════════════════════════════════════════════
SENTENCES TO ANALYZE:
═══════════════════════════════════════════════════════════════
${sentenceList}`;
}

async function extractWithClaude(sentences, context) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildVocabExtractPrompt(sentences, context),
      },
    ],
    tools: [
      {
        name: "return_vocabulary",
        description:
          "Return the curated vocabulary list extracted from the input sentences.",
        input_schema: VOCAB_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "return_vocabulary" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return { vocabulary: toolBlock.input.vocabulary };
}

async function extractWithGemini(sentences, context) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildVocabExtractPrompt(sentences, context),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                partOfSpeech: {
                  type: Type.STRING,
                  enum: PART_OF_SPEECH_VALUES,
                },
                meaning: { type: Type.STRING },
                example: { type: Type.STRING },
                sentenceIndex: { type: Type.INTEGER },
              },
              propertyOrdering: [
                "word",
                "partOfSpeech",
                "meaning",
                "example",
                "sentenceIndex",
              ],
            },
          },
        },
        propertyOrdering: ["vocabulary"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  return { vocabulary: parsed.vocabulary };
}

export async function aiExtractVocabulary(sentences, context = {}) {
  return withFallback(
    "vocab-extract",
    () => extractWithClaude(sentences, context),
    () => extractWithGemini(sentences, context),
  );
}
