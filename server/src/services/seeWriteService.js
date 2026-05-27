import { SeeWrite } from "@server/models/writing/SeeWrite";
import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ApiError } from "@server/helpers/ApiError";
import { chargeForSubmit } from "@server/helpers/chargeForSubmit";
import {
  normalizeImageFields,
  destroyCloudinaryImage,
} from "@server/helpers/imageFields";
import { aiGradeSeeWrite } from "@server/services/ai/gradingProvider";
import { ensureEnriched } from "@server/services/vocabularyService";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmission,
  getSubmissions,
  buildStatusFilter,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";
import { WRITING_TYPE } from "@server/const/writting";
import {
  SW_LESSON_TYPE,
  SW_LIST_PROJECTION,
  SW_ADMIN_PROJECTION,
  SW_POPULATE_WORDPOOL,
  SW_UPDATABLE_FIELDS,
} from "@server/const/seeWrite";
import { createWriting } from "@server/services/writingService";
import {
  resolveSort,
  buildLessonsListPromise,
  buildTitleSearch,
} from "@server/helpers/writing/listLessonsQuery";

// ──────────────── Helpers ────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatVocab(vocab) {
  if (!vocab) return null;
  return {
    id: vocab._id,
    word: vocab.word,
    ipa: vocab.ipa || null,
    partOfSpeech: vocab.partOfSpeech || null,
    meaning: vocab.definitions?.[0]?.viDef || "",
    audio: vocab.audio || null,
  };
}

/** Format wordPool entry for admin view (full vocab + isRequired). */
function formatAdminPoolEntry(entry) {
  return { ...formatVocab(entry.id), isRequired: entry.isRequired };
}

function buildMeaningMap(populatedWordPool) {
  const map = {};
  for (const w of populatedWordPool || []) {
    const v = w.id;
    if (v?.word) map[v.word.toLowerCase()] = v.definitions?.[0]?.viDef || "";
  }
  return map;
}

function populateQuizMeanings(quiz, meaningMap) {
  const withMeaning = (words) =>
    (words || []).map((w) => ({
      word: w,
      meaning: meaningMap[w.toLowerCase()] || "",
    }));
  return {
    score: quiz.score,
    correct: withMeaning(quiz.correct),
    missed: withMeaning(quiz.missed),
    wrong: withMeaning(quiz.wrong),
  };
}

/** Build common $match query for both user and admin list endpoints. */
function buildLessonQuery({ level, topic, search }) {
  const titleFilter = buildTitleSearch(search);
  return {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
  };
}

/**
 * Upsert each word into Vocabulary, return [{id, isRequired}] for SeeWrite.wordPool.
 * Triggers ensureEnriched background for newly inserted words.
 * Dedupes within and across required/distractor (required wins on overlap).
 */
async function resolveWordPool(requiredWords = [], distractorWords = []) {
  const normalize = (w) => String(w || "").trim().toLowerCase();
  const requiredSet = new Set(requiredWords.map(normalize).filter(Boolean));
  const distractorSet = new Set(
    distractorWords.map(normalize).filter(Boolean),
  );
  for (const w of requiredSet) distractorSet.delete(w);

  const entries = [
    ...[...requiredSet].map((word) => ({ word, isRequired: true })),
    ...[...distractorSet].map((word) => ({ word, isRequired: false })),
  ];
  if (entries.length === 0) return [];

  return Promise.all(
    entries.map(async ({ word, isRequired }) => {
      const vocab = await Vocabulary.findOneAndUpdate(
        { word },
        { $setOnInsert: { word, definitions: [] } },
        { upsert: true, new: true },
      );
      if (!vocab.definitions?.length) {
        ensureEnriched(vocab).catch((err) =>
          console.error(`[enrich] Failed for "${vocab.word}":`, err.message),
        );
      }
      return { id: vocab._id, isRequired };
    }),
  );
}

// ──────────────── User endpoints ────────────────

/**
 * GET /writing/see-and-write — List lessons + user's attempt summary
 */
export async function listLessons(filters, pagination, userId) {
  const { status } = filters;
  const { page, limit } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const statusFilter = await buildStatusFilter({
    userId,
    lessonType: SW_LESSON_TYPE,
    statuses: status,
  });
  const query = { ...buildLessonQuery(filters), ...(statusFilter || {}) };

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(SeeWrite, {
      query,
      projection: SW_LIST_PROJECTION,
      sortBy,
      order,
      page,
      limit,
    }),
    SeeWrite.countDocuments(query),
  ]);

  const attemptMap = new Map();
  if (userId && lessons.length > 0) {
    const attempts = await Attempt.find({
      userId,
      lessonId: { $in: lessons.map((l) => l._id) },
      lessonType: SW_LESSON_TYPE,
    })
      .select("lessonId status completedSentences bestScore completedAt")
      .lean();
    for (const a of attempts) attemptMap.set(String(a.lessonId), a);
  }

  return {
    items: lessons.map((lesson) => {
      const a = attemptMap.get(String(lesson._id));
      return {
        id: lesson._id,
        title: lesson.title,
        level: lesson.level,
        topic: lesson.topic,
        image: lesson.image,
        imagePublicId: lesson.imagePublicId || null,
        createdAt: lesson.createdAt,
        status: a?.status ?? "not_started",
        completedSentences: a?.completedSentences ?? 0,
        bestScore: a?.bestScore ?? 0,
        completedAt: a?.completedAt ?? null,
      };
    }),
    total,
  };
}

/**
 * GET /writing/see-and-write/:id — Lesson + user's attempt (read-only)
 */
export async function getLesson(lessonId, userId) {
  const lesson = await SeeWrite.findById(lessonId)
    .populate(SW_POPULATE_WORDPOOL)
    .lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const attempt = await Attempt.findOne({
    userId,
    lessonId,
    lessonType: SW_LESSON_TYPE,
  }).lean();

  const progress = attempt?.sentenceProgress?.find((p) => p.sentenceOrder === 1);
  const lastSubmission = progress
    ? await getLastSubmission(attempt._id, 1)
    : null;

  const keywordQuiz = attempt?.keywordQuiz
    ? populateQuizMeanings(attempt.keywordQuiz, buildMeaningMap(lesson.wordPool))
    : null;

  // Reveal full vocab data only after user completes the quiz
  const validPool = (lesson.wordPool || []).filter((w) => w.id?.word);
  const requiredKeywordCount = validPool.filter((w) => w.isRequired).length;
  const wordPool = validPool.map((w) =>
    keywordQuiz ? formatVocab(w.id) : { id: w.id._id, word: w.id.word },
  );

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    image: lesson.image,
    imagePublicId: lesson.imagePublicId || null,
    wordPool: shuffleArray(wordPool),
    requiredKeywordCount,
    minWordCount: lesson.minWordCount || null,
    maxWordCount: lesson.maxWordCount || null,
    status: attempt?.status ?? "not_started",
    completedSentences: attempt?.completedSentences ?? 0,
    bestScore: attempt?.bestScore ?? 0,
    completedAt: attempt?.completedAt ?? null,
    keywordQuiz,
    lastSubmission,
  };
}

/**
 * POST /writing/see-and-write/:lessonId/check-keywords
 * selectedKeywordIds: array of Vocabulary ObjectIds (string)
 */
export async function checkKeywords(userId, lessonId, selectedKeywordIds) {
  if (!Array.isArray(selectedKeywordIds) || selectedKeywordIds.length === 0) {
    throw ApiError.badRequest("selectedKeywordIds must be a non-empty array");
  }

  const lesson = await SeeWrite.findById(lessonId)
    .populate(SW_POPULATE_WORDPOOL)
    .lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  // Index wordPool by Vocabulary id for O(1) lookup
  const poolById = new Map();
  const requiredIds = new Set();
  for (const w of lesson.wordPool || []) {
    if (!w.id?._id || !w.id?.word) continue;
    const id = String(w.id._id);
    poolById.set(id, { word: w.id.word, isRequired: w.isRequired });
    if (w.isRequired) requiredIds.add(id);
  }

  const selectedIds = new Set(selectedKeywordIds.map(String));
  const results = { correct: [], missed: [], wrong: [] };

  for (const id of requiredIds) {
    const entry = poolById.get(id);
    if (selectedIds.has(id)) results.correct.push(entry.word);
    else results.missed.push(entry.word);
  }
  for (const id of selectedIds) {
    if (requiredIds.has(id)) continue;
    const entry = poolById.get(id);
    if (entry) results.wrong.push(entry.word);
  }

  const quizScore = Math.round(
    (results.correct.length / (requiredIds.size || 1)) * 100,
  );

  const attempt = await findOrCreateAttempt(userId, lessonId, SW_LESSON_TYPE);
  attempt.keywordQuiz = { ...results, score: quizScore };
  if (attempt.status === "not_started") attempt.status = "in_progress";
  attempt.markModified("keywordQuiz");
  await attempt.save();

  return populateQuizMeanings(
    attempt.keywordQuiz,
    buildMeaningMap(lesson.wordPool),
  );
}

/**
 * POST /writing/see-and-write/:lessonId/submit — Grade answer
 */
export async function submitAnswer(userId, lessonId, userAnswer) {
  const lesson = await SeeWrite.findById(lessonId)
    .populate(SW_POPULATE_WORDPOOL)
    .lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const requiredWords = (lesson.wordPool || [])
    .filter((w) => w.isRequired && w.id?.word)
    .map((w) => w.id.word);
  const attempt = await findOrCreateAttempt(userId, lessonId, SW_LESSON_TYPE);

  if (requiredWords.length > 0 && !attempt.keywordQuiz) {
    throw ApiError.badRequest("Keyword quiz is required before submitting");
  }

  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  const minWc = lesson.minWordCount || 0;
  if (minWc > 0 && wordCount < minWc) {
    throw ApiError.badRequest(
      `Word count ${wordCount} is below minimum ${minWc}`,
    );
  }

  return chargeForSubmit(
    {
      userId,
      reason: `submit see_and_write ${lessonId}`,
      referenceType: "Attempt",
      referenceId: lessonId,
    },
    async () => {
      // Grading prompt expects flat {word, isRequired} shape
      const lessonForGrading = {
        ...lesson,
        wordPool: requiredWords.map((word) => ({ word, isRequired: true })),
      };

      const { result: grading, provider } = await aiGradeSeeWrite(
        userAnswer,
        lessonForGrading,
        lesson.level,
      );

      const score = Math.min(100, Math.max(0, Math.round(grading.score)));
      const isCompleted = score >= COMPLETION_THRESHOLD;

      const { submission, progress } = await submitAndUpdateProgress(attempt, {
        sentenceOrder: 1,
        userAnswer,
        score,
        gradedBy: provider,
        feedback: {
          summary: grading.summary,
          enhancedVersion: grading.enhancedVersion || null,
          criteria: grading.criteria || [],
          corrections: grading.corrections || [],
        },
        isCompleted,
        totalSentences: 1,
      });

      return {
        score,
        feedback: submission.feedback,
        gradedBy: provider,
        bestScore: progress.bestScore,
        isCompleted,
      };
    },
  );
}

/**
 * GET /writing/see-and-write/:lessonId/history
 */
export async function getHistory(
  userId,
  lessonId,
  { page = 1, limit = 20 } = {},
) {
  const attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  const { docs, total } = await getSubmissions(attempt._id, {
    sentenceOrder: 1,
    page,
    limit,
  });

  return {
    lessonId,
    status: attempt.status,
    bestScore: attempt.bestScore,
    submissions: docs.reverse(),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ──────────────── Admin endpoints ────────────────

/**
 * GET /admin/writing/see-and-write — Admin list (full data)
 */
export async function adminListLessons(filters = {}, pagination = {}) {
  const { page = 1, limit = 20 } = pagination;
  const { sortBy, order } = resolveSort(filters);
  const query = buildLessonQuery(filters);

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(SeeWrite, {
      query,
      projection: SW_ADMIN_PROJECTION,
      sortBy,
      order,
      page,
      limit,
    }),
    SeeWrite.countDocuments(query),
  ]);

  // Aggregate path bypasses populate — run it manually for consistency
  await SeeWrite.populate(lessons, SW_POPULATE_WORDPOOL);

  return {
    items: lessons.map((l) => ({
      id: l._id,
      title: l.title,
      level: l.level,
      topic: l.topic,
      image: l.image,
      imagePublicId: l.imagePublicId || null,
      wordPool: (l.wordPool || []).map(formatAdminPoolEntry),
      minWordCount: l.minWordCount,
      maxWordCount: l.maxWordCount,
      createdAt: l.createdAt,
    })),
    total,
  };
}

/**
 * GET /admin/writing/see-and-write/:id — Admin detail (no shuffle)
 */
export async function adminGetLesson(lessonId) {
  const lesson = await SeeWrite.findById(lessonId)
    .populate(SW_POPULATE_WORDPOOL)
    .lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    description: lesson.description,
    image: lesson.image,
    imagePublicId: lesson.imagePublicId || null,
    wordPool: (lesson.wordPool || []).map(formatAdminPoolEntry),
    minWordCount: lesson.minWordCount,
    maxWordCount: lesson.maxWordCount,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

/**
 * POST /admin/writing/see-and-write — Create lesson
 */
export async function createLesson(body) {
  const wordPool = await resolveWordPool(
    body.requiredWords,
    body.distractorWords,
  );
  const lesson = await createWriting({
    ...body,
    type: WRITING_TYPE.SEE_AND_WRITE,
    wordPool,
  });
  return { id: lesson._id, title: lesson.title };
}

/**
 * PUT /admin/writing/see-and-write/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const existing = await SeeWrite.findById(lessonId).lean();
  if (!existing) throw ApiError.notFound("Lesson not found");

  const updates = {};
  for (const field of SW_UPDATABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  const imgFields = normalizeImageFields(body.image, body.imagePublicId);
  Object.assign(updates, imgFields);

  if (body.requiredWords !== undefined || body.distractorWords !== undefined) {
    updates.wordPool = await resolveWordPool(
      body.requiredWords,
      body.distractorWords,
    );
  }
  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const oldPublicIdToDestroy =
    "image" in imgFields &&
    existing.imagePublicId &&
    existing.imagePublicId !== imgFields.imagePublicId
      ? existing.imagePublicId
      : null;

  const updated = await SeeWrite.findByIdAndUpdate(
    lessonId,
    { $set: updates },
    { new: true, runValidators: true },
  )
    .populate(SW_POPULATE_WORDPOOL)
    .lean();
  if (!updated) throw ApiError.notFound("Lesson not found");

  if (oldPublicIdToDestroy) await destroyCloudinaryImage(oldPublicIdToDestroy);

  return {
    id: updated._id,
    title: updated.title,
    level: updated.level,
    topic: updated.topic,
    description: updated.description,
    image: updated.image,
    imagePublicId: updated.imagePublicId || null,
    wordPool: (updated.wordPool || []).map(formatAdminPoolEntry),
    minWordCount: updated.minWordCount,
    maxWordCount: updated.maxWordCount,
    updatedAt: updated.updatedAt,
  };
}

/**
 * DELETE /admin/writing/see-and-write/:id
 */
export async function deleteLesson(lessonId) {
  const deleted = await SeeWrite.findByIdAndDelete(lessonId);
  if (!deleted) throw ApiError.notFound("Lesson not found");
  if (deleted.imagePublicId) {
    await destroyCloudinaryImage(deleted.imagePublicId);
  }
  return { id: lessonId };
}

/**
 * DELETE /admin/writing/see-and-write?ids=a,b,c — Bulk delete + cascade attempts/submissions
 */
export async function bulkDeleteLessons(ids) {
  const docs = await SeeWrite.find({ _id: { $in: ids } })
    .select("_id imagePublicId")
    .lean();
  if (docs.length === 0) return { deleted: 0 };

  const docIds = docs.map((d) => d._id);
  const attempts = await Attempt.find({
    lessonId: { $in: docIds },
    lessonType: SW_LESSON_TYPE,
  })
    .select("_id")
    .lean();
  const attemptIds = attempts.map((a) => a._id);

  await Promise.all([
    SeeWrite.deleteMany({ _id: { $in: docIds } }),
    attemptIds.length
      ? Submission.deleteMany({ attemptId: { $in: attemptIds } })
      : Promise.resolve(),
    attemptIds.length
      ? Attempt.deleteMany({ _id: { $in: attemptIds } })
      : Promise.resolve(),
  ]);

  const publicIds = docs.map((d) => d.imagePublicId).filter(Boolean);
  if (publicIds.length > 0) {
    await Promise.allSettled(publicIds.map((pid) => destroyCloudinaryImage(pid)));
  }

  return { deleted: docs.length };
}
