import { Type, claude, genai, withFallback } from "./client";
import { createPartFromUri } from "@google/genai";

const LEVEL_CRITERIA = {
  beginner: `Level: BEGINNER — Be encouraging and lenient.
- Accept simple sentence structures (S+V+O) even if the reference uses more complex forms
- Accept basic vocabulary even if the reference uses more advanced words (e.g. "happy" instead of "delighted")
- Do NOT penalize for missing articles (a/an/the), minor preposition errors, or simple tense mistakes
- Focus evaluation on: Does the core meaning come through? Are the key words present?
- Acceptable paraphrases should score 70+ if meaning is preserved
- Grammar scoring: only penalize errors that cause confusion, not stylistic imperfections`,

  intermediate: `Level: INTERMEDIATE — Balance accuracy with encouragement.
- Expect correct basic grammar (tenses, subject-verb agreement, articles)
- Accept reasonable synonym substitutions but penalize if tone/register changes significantly
- Expect most elements of the Vietnamese sentence to be present
- Minor word order issues are acceptable if meaning is clear
- Penalize run-on sentences or fragments
- Grammar scoring: penalize consistent pattern errors, not one-off slips`,

  advanced: `Level: ADVANCED — Expect near-native quality.
- Expect grammatically correct, natural-sounding English
- Expect appropriate vocabulary matching the context and tone (formal letter vs casual)
- Expect idiomatic expressions where the Vietnamese implies them
- Penalize unnatural phrasing even if technically correct
- Expect all nuances and elements from the Vietnamese sentence
- Grammar scoring: penalize all errors including subtle ones (collocations, article usage, preposition choice)`,
};

const CONTENT_TYPE_CONTEXT = {
  email: `Content type: EMAIL — Formal/semi-formal correspondence.
- Expect proper greeting (Dear/Hi) and closing (Best wishes/Regards/Sincerely)
- Formal tone throughout; penalize slang or overly casual language
- "Dear" is more appropriate than "Hi" in formal emails; "Hi" acceptable in semi-formal`,

  diary: `Content type: DIARY — Personal, informal writing.
- Accept casual, conversational tone
- Contractions (I'm, don't, can't) are natural and expected
- First-person perspective; emotional expressions are appropriate
- Do NOT penalize informal grammar that's natural in diary entries`,

  essay: `Content type: ESSAY — Academic, structured writing.
- Expect formal academic tone, no contractions
- Penalize colloquial expressions or slang
- Expect clear topic sentences and logical connectors
- Vocabulary should be precise and academic where appropriate`,

  article: `Content type: ARTICLE — Journalistic, informative writing.
- Expect clear, concise language
- Neutral, objective tone preferred
- Expect proper attribution language if quoting
- Accept both formal and semi-formal register`,

  story: `Content type: STORY — Narrative, creative writing.
- Accept varied sentence lengths and creative expression
- Dialogue can be informal; narration should be grammatically correct
- Accept literary devices and expressive language
- Tone can shift based on narrative context`,

  report: `Content type: REPORT — Professional, data-driven writing.
- Expect formal, impersonal tone (passive voice acceptable)
- Expect precise, technical vocabulary where appropriate
- Penalize emotional or subjective language
- Clear, structured sentences preferred`,

  general: `Content type: GENERAL — Standard English writing.
- Apply standard grammar and vocabulary expectations
- Accept both formal and semi-formal register
- Focus on clarity and natural expression`,
};

const GRADING_PROMPT = (userAnswer, referenceAnswer, vietnameseText, level, contentType) =>
  `You are a strict but fair English writing evaluator for Vietnamese learners practicing reverse translation (Vietnamese → English).

${LEVEL_CRITERIA[level] || LEVEL_CRITERIA.intermediate}

${CONTENT_TYPE_CONTEXT[contentType] || CONTENT_TYPE_CONTEXT.general}

Vietnamese sentence: "${vietnameseText}"
Reference English answer: "${referenceAnswer}"
Student's answer: "${userAnswer}"

Evaluate based on these 5 criteria:

1. **Meaning accuracy** (0-30 points): Does the translation convey the same meaning as the Vietnamese?
   - 30: Identical meaning
   - 20-29: Core meaning preserved, minor nuance differences
   - 10-19: Partial meaning, important parts missing or wrong
   - 0-9: Meaning significantly different

2. **Grammar correctness** (0-25 points): Is the English grammatically correct?
   - 25: Perfect grammar
   - 15-24: Minor errors not causing confusion
   - 5-14: Multiple errors or awkward structure
   - 0-4: Severe errors
   (Apply level-appropriate grammar standards)

3. **Vocabulary appropriateness** (0-20 points): Are word choices natural and fitting?
   - 20: Natural, idiomatic choices matching context and content type
   - 12-19: Acceptable but slightly unnatural or wrong register for the content type
   - 5-11: Wrong or unusual word choices
   - 0-4: Critical vocabulary errors
   (Consider content type: formal email vocab ≠ diary vocab ≠ essay vocab)

4. **Completeness** (0-15 points): Are all elements from the Vietnamese sentence present?
   - 15: Everything translated
   - 8-14: Minor omissions
   - 1-7: Important parts missing
   - 0: Most of sentence missing

5. **Naturalness & tone** (0-10 points): Does it sound like natural English with appropriate formality?
   - 10: Native-like, tone matches both level expectations and content type
   - 5-9: Understandable but tone doesn't quite fit the content type
   - 0-4: Clearly unnatural or wrong register for this type of writing

Total = sum of all criteria (0-100).

Rules:
- Accept valid paraphrases that preserve meaning (don't require exact word match)
- Apply BOTH level-appropriate AND content-type-appropriate standards
- If answer is unrelated or gibberish, score 0-10

Provide:
1. Total score (0-100)
2. Brief evaluation summary in Vietnamese (1-2 sentences, mention content type expectations if relevant)
3. 1-3 specific strengths in Vietnamese
4. 1-3 specific improvements in Vietnamese if score < 100, empty array if perfect`;

const GRADING_SCHEMA = {
  score: { type: "number", description: "Score from 0 to 100" },
  summary: { type: "string", description: "Brief evaluation summary in Vietnamese" },
  strengths: { type: "array", items: { type: "string" }, description: "Specific strengths in Vietnamese" },
  improvements: { type: "array", items: { type: "string" }, description: "Specific improvements in Vietnamese, empty if perfect" },
};

async function gradeWithClaude(userAnswer, referenceAnswer, vietnameseText, level, contentType) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      { role: "user", content: GRADING_PROMPT(userAnswer, referenceAnswer, vietnameseText, level, contentType) },
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

async function gradeWithGemini(userAnswer, referenceAnswer, vietnameseText, level, contentType) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: GRADING_PROMPT(userAnswer, referenceAnswer, vietnameseText, level, contentType),
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
  level = "intermediate",
  contentType = "general",
) {
  return withFallback(
    "grading",
    () => gradeWithClaude(userAnswer, referenceAnswer, vietnameseText, level, contentType),
    () => gradeWithGemini(userAnswer, referenceAnswer, vietnameseText, level, contentType),
  );
}

// --- See & Write grading ---

const SW_LEVEL_CRITERIA = {
  beginner: `Level: BEGINNER — Be encouraging and lenient.
- Accept simple sentences (S+V+O), basic adjectives (big, nice, beautiful)
- Do NOT penalize missing articles, minor preposition errors, or simple tense mistakes
- Accept short paragraphs (3-5 sentences) as adequate
- Focus on: Can the reader understand what is being described? Are required words present?
- A simple but clear description should score 70+`,

  intermediate: `Level: INTERMEDIATE — Balance accuracy with encouragement.
- Expect varied sentence structures (not just S+V+O repeated)
- Expect descriptive adjectives/adverbs beyond basic ones
- Penalize repetitive sentence starters ("There is... There is... There is...")
- Expect a logical flow between sentences (spatial, temporal, or thematic order)
- Minor word choice issues acceptable if meaning is clear`,

  advanced: `Level: ADVANCED — Expect polished descriptive writing.
- Expect rich vocabulary: vivid adjectives, precise verbs, figurative language
- Expect complex sentences with varied connectors and transitions
- Expect a cohesive paragraph with clear structure (opening → body → closing impression)
- Penalize generic descriptions that could apply to any image
- Expect idiomatic expressions and natural collocations`,
};

const SEE_WRITE_PROMPT = (userAnswer, lesson, wordCount, level, quizScore) => {
  const requiredWords = lesson.requiredWords?.length
    ? lesson.requiredWords.join(", ")
    : "none";
  const minWc = lesson.minWordCount ? lesson.minWordCount : null;
  const maxWc = lesson.maxWordCount ? lesson.maxWordCount : null;
  const wcRequirement = minWc && maxWc ? `${minWc}–${maxWc} words`
    : minWc ? `at least ${minWc} words`
    : maxWc ? `at most ${maxWc} words`
    : "no specific requirement";

  return `You are a strict but fair English writing evaluator for Vietnamese learners.

Task: "See & Write" — the student views the image below and writes a descriptive paragraph in English.
Lesson title: "${lesson.title}"

${SW_LEVEL_CRITERIA[level] || SW_LEVEL_CRITERIA.intermediate}

Required words: ${requiredWords}
Word count requirement: ${wcRequirement}
Actual word count: ${wordCount}${quizScore != null ? `\nKeyword quiz score: ${quizScore}% (bonus/penalty up to ±5 on final score)` : ""}

Student's answer: "${userAnswer}"

Evaluate based on these 5 criteria:

1. **Content accuracy** (0-25 points): Does the writing accurately describe what is shown in the image?
   - Compare the student's description against what you see in the image
   - 25: Accurate, detailed description matching the image
   - 15-24: Mostly accurate, minor details wrong or missing
   - 5-14: Partially accurate, significant elements wrong or invented
   - 0-4: Does not match the image at all

2. **Task completion** (0-20 points): Did the student complete the writing task?
   - Required words usage: Are they used naturally in context (not just listed)?
${lesson.requiredWords?.length ? `     Count how many of [${requiredWords}] appear. Deduct proportionally for missing ones.` : "     No required words — evaluate whether the writing is a genuine descriptive paragraph."}
   - Word count: ${minWc || maxWc ? `Is it within ${wcRequirement}?` : "Is the length reasonable for the topic?"}
   - 20: All words used naturally, appropriate length
   - 12-19: Most words used, minor length issue
   - 5-11: Several words missing or forced, too short/long
   - 0-4: Most words missing, way off length

3. **Vocabulary & expression** (0-25 points): Is the language rich and descriptive?
   - Variety: diverse adjectives, verbs, expressions (not repetitive)?
   - Descriptiveness: vivid details (colors, sizes, positions, feelings, atmosphere)?
   - Level-appropriateness: vocabulary should match the student's level
   - 25: Rich, varied, vivid descriptive language
   - 15-24: Good variety with some repetition or generic words
   - 5-14: Limited vocabulary, repetitive, mostly basic words
   - 0-4: Very poor or no descriptive language

4. **Grammar & structure** (0-20 points): Is the English correct and well-structured?
   - Grammar accuracy (apply level-appropriate standards)
   - Sentence variety: mix of simple/compound/complex sentences
   - Paragraph coherence: logical ordering (general → specific, foreground → background)
   - 20: Excellent grammar, varied structures, coherent flow
   - 12-19: Minor errors, some variety, generally coherent
   - 5-11: Multiple errors, repetitive structures, weak organization
   - 0-4: Severe errors making text hard to understand

5. **Naturalness & creativity** (0-10 points): Does it read well?
   - Natural English (not word-by-word translation from Vietnamese)?
   - Any creative element (opening hook, personal impression, figurative language)?
   - 10: Natural, engaging, shows personal voice
   - 5-9: Readable but somewhat mechanical or generic
   - 1-4: Stiff, clearly translated, no personal touch
   - 0: Incomprehensible

Total = sum of 5 criteria (0-100)${quizScore != null ? " + quiz bonus/penalty (±5)" : ""}.

Rules:
- If answer is gibberish, copied text, or completely unrelated to the image: score 0-10
- DO penalize if required words are present but used unnaturally (e.g., just listed at the end)
- DO penalize if the description contains details that clearly contradict the image

Respond with:
1. Total score (0-100)
2. Brief evaluation summary in Vietnamese (1-2 sentences)
3. 1-3 specific strengths in Vietnamese
4. 1-3 specific improvements in Vietnamese if score < 100, empty array if perfect`;
};

async function gradeSeeWriteWithClaude(userAnswer, lesson, wordCount, level, quizScore) {
  const content = [
    { type: "image", source: { type: "url", url: lesson.mediaUrl } },
    { type: "text", text: SEE_WRITE_PROMPT(userAnswer, lesson, wordCount, level, quizScore) },
  ];

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content }],
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

async function gradeSeeWriteWithGemini(userAnswer, lesson, wordCount, level, quizScore) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { text: SEE_WRITE_PROMPT(userAnswer, lesson, wordCount, level, quizScore) },
      createPartFromUri(lesson.mediaUrl, "image/jpeg"),
    ],
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
 * Grade See & Write answer: Claude (primary) → Gemini (fallback)
 */
export async function aiGradeSeeWrite(userAnswer, lesson, level = "intermediate", quizScore = null) {
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  return withFallback(
    "grading-see-write",
    () => gradeSeeWriteWithClaude(userAnswer, lesson, wordCount, level, quizScore),
    () => gradeSeeWriteWithGemini(userAnswer, lesson, wordCount, level, quizScore),
  );
}
