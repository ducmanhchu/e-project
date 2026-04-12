import { Type, claude, genai, withFallback } from "./client";
import { createPartFromUri } from "@google/genai";
import { EXAM_MIN_WORDS } from "@server/const/exercise";

const LEVEL_CRITERIA = {
  beginner: `Level: BEGINNER — Be encouraging but still accurate.
- Accept simple sentence structures (S+V+O) even if the reference uses more complex forms
- Accept basic vocabulary even if the reference uses more advanced words (e.g. "happy" instead of "delighted")
- Do NOT penalize for missing articles (a/an/the), minor preposition errors, or simple tense mistakes
- Focus evaluation on: Does the core meaning come through? Are the key words present?
- Acceptable paraphrases should score 70+ if meaning is preserved AND spelling/grammar is mostly correct
- Grammar scoring: only penalize errors that cause confusion, not stylistic imperfections
- Spelling errors: Each misspelled word MUST be penalized under Grammar (2-3 points per misspelled word). Multiple spelling errors should result in significant deduction. A sentence with 3+ spelling errors should NOT score above 60`,

  intermediate: `Level: INTERMEDIATE — Balance accuracy with encouragement.
- Expect correct basic grammar (tenses, subject-verb agreement, articles)
- Accept reasonable synonym substitutions but penalize if tone/register changes significantly
- Expect most elements of the Vietnamese sentence to be present
- Minor word order issues are acceptable if meaning is clear
- Penalize run-on sentences or fragments
- Grammar scoring: penalize consistent pattern errors, not one-off slips
- Spelling errors: penalize 3-4 points per misspelled word. Multiple spelling errors should NOT pass (score < 70)`,

  advanced: `Level: ADVANCED — Expect near-native quality.
- Expect grammatically correct, natural-sounding English
- Expect appropriate vocabulary matching the context and tone (formal letter vs casual)
- Expect idiomatic expressions where the Vietnamese implies them
- Penalize unnatural phrasing even if technically correct
- Expect all nuances and elements from the Vietnamese sentence
- Grammar scoring: penalize all errors including subtle ones (collocations, article usage, preposition choice)
- Spelling errors: penalize heavily (5+ points per misspelled word). Any spelling error is unacceptable at this level`,
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

const GRADING_PROMPT = (
  userAnswer,
  referenceAnswer,
  vietnameseText,
  level,
  contentType,
) =>
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

2. **Grammar & Spelling correctness** (0-25 points): Is the English grammatically correct and properly spelled?
   - 25: Perfect grammar and spelling
   - 15-24: 1 minor error (typo or grammar slip)
   - 5-14: 2 errors
   - 0-4: 3+ errors (spelling OR grammar)
   - CRITICAL: Each misspelled word (e.g. "wnat" for "want") counts as a FULL error, same weight as a grammar error. Count every misspelled word individually.
   (Apply level-appropriate grammar standards)

3. **Vocabulary appropriateness** (0-20 points): Are word choices natural, fitting, and correctly spelled?
   - 20: Natural, idiomatic choices matching context and content type, all words spelled correctly
   - 12-19: Acceptable choices, max 1 misspelled word
   - 5-11: Wrong/unusual word choices OR 2+ misspelled words
   - 0-4: Critical vocabulary errors or most words misspelled
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
- If student writes in Vietnamese instead of English, score 0
- SPELLING IS CRITICAL: A sentence with 3+ misspelled words should score MAX 55 total regardless of meaning accuracy. Spelling errors affect BOTH Grammar AND Vocabulary scores simultaneously

Provide:
1. Total score (0-100)
2. "suggestion": The corrected sentence with INLINE DIFF showing what changed. Format: write the correct word in bold followed by the student's wrong word in parentheses with strikethrough. Example: if student wrote "I hoep you ar doin wel." → suggestion is "I **hope**(hoep) you **are doing well**(ar doin wel).". If score is 100, return the student's answer as-is (no diff needed). If unrelated/gibberish/Vietnamese, return empty string.
3. "improvements": Array of specific error corrections in Vietnamese. Each item explains ONE error: what was wrong and what it should be. Example: ["Bạn đã viết sai chính tả từ **hoep**, cần sửa thành **hope**.", "Từ **doin** nên được viết đầy đủ là **doing** để đúng ngữ pháp."]. If score is 100, return empty array [].
4. "comment": Brief overall comment in Vietnamese (1-2 sentences max). If score is 100, give SHORT praise like "Bản dịch của bạn rất chính xác và tự nhiên. Giữ vững phong độ nhé!". If score < 100, briefly summarize what needs fixing. Keep it concise.`;

const GRADING_SCHEMA = {
  score: { type: "number", description: "Score from 0 to 100" },
  suggestion: {
    type: "string",
    description:
      "Corrected sentence with inline diff: **correct**(wrong). Empty string if unrelated/gibberish/Vietnamese",
  },
  improvements: {
    type: "array",
    items: { type: "string" },
    description: "Array of specific error corrections in Vietnamese. Empty array if score is 100",
  },
  comment: {
    type: "string",
    description: "Brief overall comment in Vietnamese (1-2 sentences)",
  },
};

async function gradeWithClaude(
  userAnswer,
  referenceAnswer,
  vietnameseText,
  level,
  contentType,
) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: GRADING_PROMPT(
          userAnswer,
          referenceAnswer,
          vietnameseText,
          level,
          contentType,
        ),
      },
    ],
    tools: [
      {
        name: "return_grading",
        description: "Return the grading result",
        input_schema: {
          type: "object",
          properties: GRADING_SCHEMA,
          required: ["score", "suggestion", "improvements", "comment"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_grading" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function gradeWithGemini(
  userAnswer,
  referenceAnswer,
  vietnameseText,
  level,
  contentType,
) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: GRADING_PROMPT(
      userAnswer,
      referenceAnswer,
      vietnameseText,
      level,
      contentType,
    ),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          suggestion: { type: Type.STRING },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          comment: { type: Type.STRING },
        },
        propertyOrdering: ["score", "suggestion", "improvements", "comment"],
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
    () =>
      gradeWithClaude(
        userAnswer,
        referenceAnswer,
        vietnameseText,
        level,
        contentType,
      ),
    () =>
      gradeWithGemini(
        userAnswer,
        referenceAnswer,
        vietnameseText,
        level,
        contentType,
      ),
  );
}

// --- See & Write grading ---

const SW_LEVEL_CRITERIA = {
  beginner: `Level: BEGINNER — Encouraging but still check accuracy.
- Accept simple sentences (S+V+O), basic adjectives
- Do NOT penalize minor article/preposition errors
- Still MUST check: does description match the image? Are keywords used?
- A simple but accurate description with keywords should score 70+
- Inaccurate description (doesn't match image) should score below 15 on Task Achievement regardless of grammar`,

  intermediate: `Level: INTERMEDIATE — Balance accuracy with quality.
- Expect varied sentence structures, not just "There is... There is..."
- Keywords must be woven into sentences naturally, not listed
- Description must cover main elements visible in the image
- Penalize generic descriptions that could apply to any image`,

  advanced: `Level: ADVANCED — Expect polished, accurate descriptive writing.
- Rich vocabulary, precise verbs, figurative language
- Complex sentences with varied connectors
- Description must capture details, atmosphere, and spatial relationships in the image
- Penalize any inaccuracy about the image content`,
};

const SEE_WRITE_PROMPT = (userAnswer, lesson, wordCount, level) => {
  const requiredWords = lesson.requiredWords?.length
    ? lesson.requiredWords.join(", ")
    : "none";
  const requiredCount = lesson.requiredWords?.length || 0;
  const minWc = lesson.minWordCount ? lesson.minWordCount : null;
  const maxWc = lesson.maxWordCount ? lesson.maxWordCount : null;
  const wcRequirement =
    minWc && maxWc
      ? `${minWc}–${maxWc} words`
      : minWc
        ? `at least ${minWc} words`
        : maxWc
          ? `at most ${maxWc} words`
          : "no specific requirement";

  return `You are an English teacher grading a Vietnamese student's image description.
Look at the image carefully FIRST, then evaluate whether the student's writing accurately describes what you see.

${SW_LEVEL_CRITERIA[level] || SW_LEVEL_CRITERIA.intermediate}

═══ CONTEXT ═══
Required keywords (${requiredCount}): [${requiredWords}]
Word count: ${wordCount} (requirement: ${wcRequirement})

Student's writing:
"""
${userAnswer}
"""

═══ WRITING STYLE FOR ALL COMMENTS ═══
- Vietnamese, CONCISE — max 1-2 short sentences per criterion
- Quote specific English phrases from student's writing using single quotes
- NO filler: skip "Học sinh đã", "Bài viết của bạn"
- Go straight to the point

═══ STEP 1: IMAGE VERIFICATION ═══
Before scoring, compare the student's writing against the image:
- What does the image ACTUALLY show? (objects, people, setting, actions, colors, spatial layout)
- Does the student describe things that are NOT in the image? (= fabrication, penalize heavily)
- Does the student MISS major elements visible in the image?

═══ STEP 2: KEYWORD CHECK ═══
For each required keyword [${requiredWords}]:
- Is it present in the student's writing?
- Is it used NATURALLY in a sentence (good) or just listed/forced (penalize)?
- Example of forced usage: "I can see ocean, sand, umbrella, sunset" (= listing, not natural)
- Example of natural usage: "The golden sand stretches along the ocean shore" (= woven in)

═══ STEP 3: SCORING — 4 criteria ═══

1. **task_achievement** (0-25):
   Image accuracy + keyword usage + word count.
   - How many keywords used naturally? (${requiredCount} required: [${requiredWords}])
   - Does description match the actual image content?
   - Fabricated details (things NOT in image) → heavy penalty
   - Missing major image elements → penalty
   - Keywords just listed, not in sentences → max 15${wordCount < (minWc || 0) ? `\n   - Word count ${wordCount} < ${minWc} → penalty` : ""}
   22-25: accurate + all keywords natural + correct length | 16-21: mostly accurate, 1-2 keywords missing | 9-15: partially matches image OR keywords forced | 0-8: doesn't match image

2. **coherence_cohesion** (0-25):
   Paragraph structure + transitions + flow.
   22-25: clear structure, smooth transitions | 16-21: generally coherent | 9-15: weak, repetitive | 0-8: no structure

3. **lexical_resource** (0-25):
   Vocabulary variety + precision + collocations.
   Quote specific word choices: good ones AND poor ones.
   22-25: rich, precise | 16-21: good, some generic | 9-15: basic/limited | 0-8: poor

4. **grammatical_range_accuracy** (0-25):
   Grammar + sentence variety + articles/tenses/prepositions.
   Quote every error found.
   22-25: excellent | 16-21: minor errors | 9-15: frequent errors | 0-8: severe

Total = sum (0-100).

═══ ENHANCED VERSION ═══
Rewrite as improved version that:
- Describes ONLY what is actually in the image (no fabrication)
- Uses ALL required keywords [${requiredWords}] naturally
- Fixes grammar/vocabulary
- Stays within ${wcRequirement}

═══ CORRECTIONS ═══
1-5 corrections: quote phrase → better version → brief Vietnamese explanation (1 sentence). Include any fabricated details as corrections. Empty if perfect.

═══ RULES ═══
- Summary: 1 sentence Vietnamese, mention keyword usage and image accuracy
- If student describes things NOT in the image, explicitly call it out in task_achievement comment
- If keywords are just listed (not in sentences), task_achievement max 15`;
};

const SW_GRADING_SCHEMA = {
  score: { type: "number", description: "Total score 0-100" },
  summary: {
    type: "string",
    description: "1-sentence evaluation in Vietnamese",
  },
  enhancedVersion: {
    type: "string",
    description:
      "Improved version describing only what's in the image, using all keywords",
  },
  criteria: {
    type: "array",
    description: "4 criteria with concise comments",
    items: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "task_achievement | coherence_cohesion | lexical_resource | grammatical_range_accuracy",
        },
        score: { type: "number", description: "0-25" },
        maxScore: { type: "number", description: "Always 25" },
        comment: {
          type: "string",
          description:
            "Concise Vietnamese comment (1-2 sentences), quote English phrases",
        },
      },
      required: ["name", "score", "maxScore", "comment"],
    },
  },
  corrections: {
    type: "array",
    description: "1-5 corrections with quoted phrases. Empty if perfect.",
    items: {
      type: "object",
      properties: {
        original: {
          type: "string",
          description: "Problematic phrase from student",
        },
        suggestion: { type: "string", description: "Better alternative" },
        explanation: {
          type: "string",
          description: "Brief Vietnamese explanation (1 sentence)",
        },
      },
      required: ["original", "suggestion", "explanation"],
    },
  },
};

async function gradeSeeWriteWithClaude(userAnswer, lesson, wordCount, level) {
  const content = [
    { type: "image", source: { type: "url", url: lesson.mediaUrl } },
    {
      type: "text",
      text: SEE_WRITE_PROMPT(userAnswer, lesson, wordCount, level),
    },
  ];

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
    tools: [
      {
        name: "return_grading",
        description: "Return the grading result",
        input_schema: {
          type: "object",
          properties: SW_GRADING_SCHEMA,
          required: [
            "score",
            "summary",
            "enhancedVersion",
            "criteria",
            "corrections",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_grading" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function gradeSeeWriteWithGemini(userAnswer, lesson, wordCount, level) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { text: SEE_WRITE_PROMPT(userAnswer, lesson, wordCount, level) },
      createPartFromUri(lesson.mediaUrl, "image/jpeg"),
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          enhancedVersion: { type: Type.STRING },
          criteria: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                score: { type: Type.NUMBER },
                maxScore: { type: Type.NUMBER },
                comment: { type: Type.STRING },
              },
              propertyOrdering: ["name", "score", "maxScore", "comment"],
            },
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              propertyOrdering: ["original", "suggestion", "explanation"],
            },
          },
        },
        propertyOrdering: [
          "score",
          "summary",
          "enhancedVersion",
          "criteria",
          "corrections",
        ],
      },
    },
  });

  return JSON.parse(response.text);
}

// --- Rewrite (Paraphrasing) grading ---

const RW_LEVEL_CRITERIA = {
  beginner: `Level: BEGINNER — Encouraging but still educational.
- Accept simple paraphrase strategies: synonym substitution, basic word reordering
- Do NOT require complex transformations like nominalization or passive voice
- Accept if student changes 3+ words and meaning is preserved, even if structure is similar
- Minor grammar errors (articles, prepositions) are acceptable if they don't change meaning
- Focus on: Did the student TRY to say it differently? Is the core meaning still there?
- A simple but valid paraphrase should score 70+`,

  intermediate: `Level: INTERMEDIATE — Expect genuine paraphrasing skill.
- Expect at least ONE structural change (not just synonym swaps): voice change, clause reorder, sentence type change
- Penalize if student only replaces 1-2 words and keeps identical structure
- Expect correct grammar: subject-verb agreement, tenses, articles must be right
- Vocabulary replacements should be accurate synonyms (not approximate or wrong register)
- Penalize awkward collocations: "do a decision" instead of "make a decision"
- Word-for-word translation patterns from Vietnamese should be flagged`,

  advanced: `Level: ADVANCED — Expect near-native paraphrasing mastery.
- Expect creative structural transformation: nominalization, cleft sentences, inversion, participial phrases
- Synonym choices must be precise with correct connotation and register
- Collocations must be natural and idiomatic
- Penalize any grammar error, however minor
- The rewrite should sound like a native speaker wrote it
- Merely acceptable paraphrases (basic synonym swap + minor reorder) score below 70`,
};

const REWRITE_PROMPT = (userAnswer, targetSentence, level) =>
  `You are an English teacher grading a Vietnamese student's paraphrase.

${RW_LEVEL_CRITERIA[level] || RW_LEVEL_CRITERIA.intermediate}

Original: "${targetSentence}"
Student's rewrite: "${userAnswer}"

═══ WRITING STYLE FOR ALL COMMENTS ═══
- Write in Vietnamese, CONCISE — max 1-2 short sentences per criterion comment
- Quote specific English words/phrases from student's writing using single quotes
- NO filler phrases: skip "Học sinh đã", "Việc dùng", "Tuy nhiên", "Mặc dù"
- Go straight to the point: what's good, what's wrong, quote the evidence
- Example good comment: "'decided' → 'opted': chính xác. 'stay at home' → 'remain indoors': collocation tự nhiên."
- Example bad comment (too long): "Học sinh đã thực hiện việc thay đổi từ 'decided' sang 'opted', đây là một sự thay thế chính xác và phù hợp với ngữ cảnh của câu gốc."

═══ SCORING — 4 criteria ═══

1. **meaning_preservation** (0-35):
   All subjects/objects/actions preserved? Nuances intact? ("asked" ≠ "demanded", "before Friday" ≠ "by Thursday")
   31-35 = identical | 22-30 = core OK, minor shift | 11-21 = parts missing | 0-10 = wrong

2. **structural_change** (0-30):
   What strategy? (active↔passive, clause reorder, nominalization, sentence type change)
   Just synonym swaps in same order = low score.
   26-30 = fully restructured | 18-25 = clear change | 9-17 = mostly same + synonyms | 0-8 = copy

3. **grammar_accuracy** (0-20):
   Check: S-V agreement, tenses, articles, prepositions, word order, completeness.
   Quote each error found + correction. No errors → say "Không có lỗi."
   18-20 = perfect | 12-17 = minor | 5-11 = multiple | 0-4 = severe

4. **vocabulary_quality** (0-15):
   Synonym accuracy? Collocations natural? Register match? Varied or basic?
   13-15 = rich, accurate | 9-12 = good, slightly off | 4-8 = limited | 0-3 = poor

Total = sum (0-100).

═══ OUTPUT FORMAT ═══

1. "suggestion": The corrected/improved version of the student's rewrite with INLINE DIFF showing what changed. Format: write the correct word in bold followed by the student's wrong word in parentheses. Example: if student wrote "He **opted** to **remaining**(remain) at home." → show the error inline. If score is 100, return the student's answer as-is. If student copied original exactly, return empty string.

2. "improvements": Array of specific error corrections in Vietnamese. Each item explains ONE issue: what was wrong and what it should be. Example: ["Cần đổi **remaining** thành **remain** vì sau 'to' dùng động từ nguyên thể.", "Cấu trúc câu chưa thay đổi nhiều so với câu gốc, thử dùng câu bị động."]. If score is 100, return empty array [].

3. "comment": Brief overall comment in Vietnamese (1-2 sentences max). If score is 100, give SHORT praise. If score < 100, briefly summarize what needs fixing. Keep it concise — no filler.

4. "modelAnswer": One model paraphrase showing good technique. Different from student's version.

═══ RULES ═══
- Copy original exactly → structural_change = 0
- Spelling errors: each misspelled word counts as a grammar error`;

const RW_GRADING_SCHEMA = {
  score: { type: "number", description: "Total score 0-100" },
  suggestion: {
    type: "string",
    description:
      "Corrected rewrite with inline diff: **correct**(wrong). Empty if copied original or gibberish",
  },
  improvements: {
    type: "array",
    items: { type: "string" },
    description: "Array of specific error corrections in Vietnamese. Empty if score is 100",
  },
  comment: {
    type: "string",
    description: "Brief overall comment in Vietnamese (1-2 sentences)",
  },
  modelAnswer: {
    type: "string",
    description:
      "A model paraphrase demonstrating good technique, different from student's answer",
  },
};

async function gradeRewriteWithClaude(userAnswer, targetSentence, level) {
  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: REWRITE_PROMPT(userAnswer, targetSentence, level),
      },
    ],
    tools: [
      {
        name: "return_grading",
        description: "Return the grading result",
        input_schema: {
          type: "object",
          properties: RW_GRADING_SCHEMA,
          required: [
            "score",
            "suggestion",
            "improvements",
            "comment",
            "modelAnswer",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_grading" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function gradeRewriteWithGemini(userAnswer, targetSentence, level) {
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: REWRITE_PROMPT(userAnswer, targetSentence, level),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          suggestion: { type: Type.STRING },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          comment: { type: Type.STRING },
          modelAnswer: { type: Type.STRING },
        },
        propertyOrdering: [
          "score",
          "suggestion",
          "improvements",
          "comment",
          "modelAnswer",
        ],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Grade Rewrite (Paraphrasing) answer: Claude (primary) → Gemini (fallback)
 */
export async function aiGradeRewrite(
  userAnswer,
  targetSentence,
  level = "intermediate",
) {
  return withFallback(
    "grading-rewrite",
    () => gradeRewriteWithClaude(userAnswer, targetSentence, level),
    () => gradeRewriteWithGemini(userAnswer, targetSentence, level),
  );
}

// --- Exam (IELTS) grading ---

const EXAM_PROMPT = (userAnswer, exam, wordCount) => {
  const isTask1 = exam.examType === "ielts_task1";
  const minWords = EXAM_MIN_WORDS[exam.examType];
  const taskLabel = isTask1 ? "Task 1 (Academic)" : "Task 2 (Essay)";
  const criterion1Name = isTask1 ? "task_achievement" : "task_response";
  const criterion1Label = isTask1 ? "Task Achievement" : "Task Response";

  const taskContext = isTask1
    ? `This is IELTS Writing Task 1 (Academic). The student describes a visual (chart/graph/map/diagram/process).
Evaluate whether they: identified key features, highlighted trends/comparisons, wrote an overview, and met the 150-word minimum.`
    : `This is IELTS Writing Task 2 (Essay). The student writes an essay responding to a prompt.
Evaluate whether they: fully addressed all parts of the question, presented a clear position, supported ideas with examples, and met the 250-word minimum.`;

  return `You are an IELTS examiner grading a Vietnamese student's ${taskLabel} response.

${taskContext}

Exam prompt: "${exam.examPrompt}"
Student's writing (${wordCount} words, minimum ${minWords}):
"""
${userAnswer}
"""

═══ WRITING STYLE ═══
- Vietnamese, CONCISE — max 1-2 short sentences per criterion comment
- Quote specific English phrases from student's writing using single quotes
- NO filler: skip "Học sinh đã", "Việc dùng", "Tuy nhiên"
- Go straight to the point

═══ BAND SCORING — 4 IELTS criteria, each Band 1-9 ═══

1. **${criterion1Name}** (Band 1-9):
   ${
     isTask1
       ? `Did they describe key features? Overview present? Data accurately reported? ${wordCount < minWords ? `PENALIZE: only ${wordCount}/${minWords} words.` : ""}`
       : `Did they address all parts? Clear position throughout? Ideas supported? ${wordCount < minWords ? `PENALIZE: only ${wordCount}/${minWords} words.` : ""}`
   }

2. **coherence_cohesion** (Band 1-9):
   Logical paragraph structure? Cohesive devices used naturally (not mechanically)? Clear progression of ideas?

3. **lexical_resource** (Band 1-9):
   Vocabulary range and accuracy? ${isTask1 ? "Data description language (rose, declined, fluctuated, accounted for)?" : "Topic-specific vocabulary?"} Collocations natural? Spelling?

4. **grammatical_range_accuracy** (Band 1-9):
   Sentence variety (simple/compound/complex)? Grammar accuracy? Punctuation? ${isTask1 ? "Appropriate use of comparatives, passives, relative clauses?" : "Complex structures used effectively?"}

Overall band = average of 4 criteria, rounded to nearest 0.5 (IELTS standard: 6.25→6.5, 6.1→6.0).

═══ ENHANCED VERSION ═══
Rewrite the student's essay as an improved band 7.5+ version. Fix all errors, improve vocabulary and cohesion, keep student's ideas. ${isTask1 ? `Must include overview paragraph.` : `Must have clear thesis and conclusion.`}

═══ CORRECTIONS ═══
1-5 specific errors: quote phrase → correction → brief Vietnamese explanation (1 sentence). Empty if perfect.

═══ RULES ═══
- Summary: 1 sentence Vietnamese, mention overall band and key weakness
- ${wordCount < minWords ? `Word count penalty: student wrote ${wordCount}/${minWords} words — this MUST reduce ${criterion1Label} band by at least 1` : "Word count meets requirement"}
- Band descriptors follow official IELTS standards`;
};

const EXAM_GRADING_SCHEMA = {
  overallBand: {
    type: "number",
    description: "Overall IELTS band 1-9, rounded to nearest 0.5",
  },
  summary: {
    type: "string",
    description: "1-sentence evaluation in Vietnamese",
  },
  enhancedVersion: {
    type: "string",
    description: "AI-improved band 7.5+ version",
  },
  criteria: {
    type: "array",
    description: "4 IELTS criteria",
    items: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "task_achievement|task_response|coherence_cohesion|lexical_resource|grammatical_range_accuracy",
        },
        band: { type: "number", description: "Band 1-9" },
        comment: {
          type: "string",
          description:
            "Concise comment in Vietnamese (1-2 sentences), quote English phrases",
        },
      },
      required: ["name", "band", "comment"],
    },
  },
  corrections: {
    type: "array",
    description: "1-5 corrections. Empty if perfect.",
    items: {
      type: "object",
      properties: {
        original: {
          type: "string",
          description: "Problematic phrase from student",
        },
        suggestion: { type: "string", description: "Corrected version" },
        explanation: {
          type: "string",
          description: "Brief explanation in Vietnamese",
        },
      },
      required: ["original", "suggestion", "explanation"],
    },
  },
};

async function gradeExamWithClaude(userAnswer, exam, wordCount) {
  const isTask1 = exam.examType === "ielts_task1";

  const content =
    isTask1 && exam.imageUrl
      ? [
          { type: "image", source: { type: "url", url: exam.imageUrl } },
          { type: "text", text: EXAM_PROMPT(userAnswer, exam, wordCount) },
        ]
      : [{ type: "text", text: EXAM_PROMPT(userAnswer, exam, wordCount) }];

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3072,
    messages: [{ role: "user", content }],
    tools: [
      {
        name: "return_grading",
        description: "Return the IELTS grading result",
        input_schema: {
          type: "object",
          properties: EXAM_GRADING_SCHEMA,
          required: [
            "overallBand",
            "summary",
            "enhancedVersion",
            "criteria",
            "corrections",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_grading" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  return toolBlock.input;
}

async function gradeExamWithGemini(userAnswer, exam, wordCount) {
  const isTask1 = exam.examType === "ielts_task1";

  const contents =
    isTask1 && exam.imageUrl
      ? [
          { text: EXAM_PROMPT(userAnswer, exam, wordCount) },
          createPartFromUri(exam.imageUrl, "image/jpeg"),
        ]
      : [{ text: EXAM_PROMPT(userAnswer, exam, wordCount) }];

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          overallBand: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          enhancedVersion: { type: Type.STRING },
          criteria: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                band: { type: Type.NUMBER },
                comment: { type: Type.STRING },
              },
              propertyOrdering: ["name", "band", "comment"],
            },
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              propertyOrdering: ["original", "suggestion", "explanation"],
            },
          },
        },
        propertyOrdering: [
          "overallBand",
          "summary",
          "enhancedVersion",
          "criteria",
          "corrections",
        ],
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Grade Exam (IELTS) answer: Claude (primary) → Gemini (fallback)
 */
export async function aiGradeExam(userAnswer, exam) {
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  return withFallback(
    "grading-exam",
    () => gradeExamWithClaude(userAnswer, exam, wordCount),
    () => gradeExamWithGemini(userAnswer, exam, wordCount),
  );
}

/**
 * Grade See & Write answer: Claude (primary) → Gemini (fallback)
 */
export async function aiGradeSeeWrite(
  userAnswer,
  lesson,
  level = "intermediate",
) {
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  return withFallback(
    "grading-see-write",
    () => gradeSeeWriteWithClaude(userAnswer, lesson, wordCount, level),
    () => gradeSeeWriteWithGemini(userAnswer, lesson, wordCount, level),
  );
}
