import { SeeWrite } from "@server/models/writing/SeeWrite";
import { Attempt } from "@server/models/attempt/Attempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeSeeWrite } from "@server/services/ai/gradingProvider";
import { aiTranslateKeywords } from "@server/services/ai/keywordProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmission,
  getSubmissions,
  buildStatusFilter,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";
import {
  resolveSort,
  buildLessonsListPromise,
  buildTitleSearch,
} from "@server/helpers/writing/listLessonsQuery";

const SW_LIST_PROJECTION = {
  title: 1,
  level: 1,
  topic: 1,
  image: 1,
  createdAt: 1,
};

function buildMeaningMap(wordPool) {
  const map = {};
  for (const w of wordPool || []) {
    map[w.word.toLowerCase()] = w.meaning;
  }
  return map;
}

function populateQuizMeanings(quiz, meaningMap) {
  const withMeaning = (words) => (words || []).map((w) => ({ word: w, meaning: meaningMap[w.toLowerCase()] || "" }));
  return {
    score: quiz.score,
    correct: withMeaning(quiz.correct),
    missed: withMeaning(quiz.missed),
    wrong: withMeaning(quiz.wrong),
  };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /writing/see-and-write — List lessons + user's attempt summary
 */
export async function listLessons(filters, pagination, userId) {
  const { level, topic, search, status } = filters;
  const { page, limit } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const statusFilter = await buildStatusFilter({
    userId,
    lessonType: "SeeWrite",
    statuses: status,
  });
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
    ...(statusFilter || {}),
  };

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
      lessonType: "SeeWrite",
    })
      .select("lessonId status completedSentences bestScore completedAt")
      .lean();
    for (const a of attempts) {
      attemptMap.set(String(a.lessonId), a);
    }
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
 * GET /writing/see-and-write/:id — Lesson + user's attempt (merged)
 */
export async function getLesson(lessonId, userId) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const attempt = await findOrCreateAttempt(userId, lessonId, "SeeWrite");

  const progress = (attempt.sentenceProgress || []).find((p) => p.sentenceOrder === 1);
  const lastSubmission = progress
    ? await getLastSubmission(attempt._id, 1)
    : null;

  let keywordQuiz = null;
  if (attempt.keywordQuiz) {
    const wordPoolDoc = await SeeWrite.findById(lessonId).select("wordPool").lean();
    const meaningMap = buildMeaningMap(wordPoolDoc?.wordPool);
    keywordQuiz = populateQuizMeanings(attempt.keywordQuiz, meaningMap);
  }

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    image: lesson.image,
    wordPool: shuffleArray((lesson.wordPool || []).map((w) => w.word)),
    minWordCount: lesson.minWordCount || null,
    maxWordCount: lesson.maxWordCount || null,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    completedAt: attempt.completedAt || null,
    keywordQuiz,
    lastSubmission,
  };
}

/**
 * POST /writing/see-and-write/:lessonId/check-keywords
 */
export async function checkKeywords(userId, lessonId, selectedKeywords) {
  if (!Array.isArray(selectedKeywords) || selectedKeywords.length === 0) {
    throw ApiError.badRequest("selectedKeywords must be a non-empty array");
  }

  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const required = (lesson.wordPool || []).filter((w) => w.isRequired);
  const correctSet = new Set(required.map((w) => w.word.toLowerCase()));
  const selectedSet = new Set(selectedKeywords.map((w) => w.toLowerCase()));

  const results = { correct: [], missed: [], wrong: [] };

  for (const w of required) {
    if (selectedSet.has(w.word.toLowerCase())) {
      results.correct.push(w.word);
    } else {
      results.missed.push(w.word);
    }
  }

  for (const word of selectedKeywords) {
    if (!correctSet.has(word.toLowerCase())) {
      results.wrong.push(word);
    }
  }

  const quizScore = Math.round(
    (results.correct.length / (required.length || 1)) * 100,
  );

  // Save quiz result
  const attempt = await findOrCreateAttempt(userId, lessonId, "SeeWrite");
  attempt.keywordQuiz = {
    correct: results.correct,
    missed: results.missed,
    wrong: results.wrong,
    score: quizScore,
  };
  attempt.markModified("keywordQuiz");
  await attempt.save();

  const meaningMap = buildMeaningMap(lesson.wordPool);
  return populateQuizMeanings(attempt.keywordQuiz, meaningMap);
}

/**
 * POST /writing/see-and-write/:lessonId/submit — Grade answer
 */
export async function submitAnswer(userId, lessonId, userAnswer) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  // Enforce quiz if lesson has required words
  const hasKeywords = (lesson.wordPool || []).some((w) => w.isRequired);
  const attempt = await findOrCreateAttempt(userId, lessonId, "SeeWrite");

  if (hasKeywords && !attempt.keywordQuiz) {
    throw ApiError.badRequest("Keyword quiz is required before submitting");
  }

  // Validate word count
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  const minWc = lesson.minWordCount || 0;
  if (minWc > 0 && wordCount < minWc) {
    throw ApiError.badRequest(`Word count ${wordCount} is below minimum ${minWc}`);
  }

  const { result: grading, provider } = await aiGradeSeeWrite(
    userAnswer,
    lesson,
    lesson.level,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));

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
    isCompleted: score >= COMPLETION_THRESHOLD,
    totalSentences: 1,
  });

  return {
    score,
    feedback: submission.feedback,
    gradedBy: provider,
    bestScore: progress.bestScore,
    isCompleted: score >= COMPLETION_THRESHOLD,
  };
}

/**
 * GET /writing/see-and-write/:lessonId/history
 */
export async function getHistory(userId, lessonId, { page = 1, limit = 20 } = {}) {
  const attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  const { docs, total } = await getSubmissions(attempt._id, { sentenceOrder: 1, page, limit });

  return {
    lessonId,
    status: attempt.status,
    bestScore: attempt.bestScore,
    submissions: docs.reverse(),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * GET /writing/see-and-write — Admin list (with filter + sort like user list, full data)
 */
export async function adminListLessons(filters = {}, pagination = {}) {
  const { level, topic, search } = filters;
  const { page = 1, limit = 20 } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
  };

  const adminProjection = {
    title: 1,
    level: 1,
    topic: 1,
    image: 1,
    wordPool: 1,
    minWordCount: 1,
    maxWordCount: 1,
    createdAt: 1,
  };

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(SeeWrite, {
      query,
      projection: adminProjection,
      sortBy,
      order,
      page,
      limit,
    }),
    SeeWrite.countDocuments(query),
  ]);

  return {
    items: lessons.map((l) => ({
      id: l._id,
      title: l.title,
      level: l.level,
      topic: l.topic,
      image: l.image,
      wordPool: l.wordPool || [],
      minWordCount: l.minWordCount,
      maxWordCount: l.maxWordCount,
      createdAt: l.createdAt,
    })),
    total,
  };
}

/**
 * GET /writing/see-and-write/:id — Admin detail (no shuffle)
 */
export async function adminGetLesson(lessonId) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    description: lesson.description,
    image: lesson.image,
    wordPool: lesson.wordPool || [],
    minWordCount: lesson.minWordCount,
    maxWordCount: lesson.maxWordCount,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

/**
 * POST /writing/see-and-write — Create lesson
 */
export async function createLesson(body) {
  const lesson = await createWriting({ ...body, type: WRITING_TYPE.SEE_AND_WRITE });
  // AI translate wordPool in background
  translateWordPool(lesson._id).catch((err) =>
    console.error(`[translate] Failed for SW "${lesson._id}":`, err.message),
  );
  return {
    id: lesson._id,
    title: lesson.title,
  };
}

/**
 * PUT /writing/see-and-write/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const lesson = await SeeWrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const allowedFields = [
    "title", "level", "topic", "description",
    "image", "minWordCount", "maxWordCount",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  let needsTranslate = false;
  if (body.requiredWords !== undefined || body.distractorWords !== undefined) {
    const requiredWords = body.requiredWords || [];
    const distractorWords = body.distractorWords || [];
    updates.wordPool = [
      ...requiredWords.map((w) => ({ word: w, meaning: "", isRequired: true })),
      ...distractorWords.map((w) => ({ word: w, meaning: "", isRequired: false })),
    ];
    needsTranslate = true;
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const updated = await SeeWrite.findByIdAndUpdate(
    lessonId,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (needsTranslate) {
    translateWordPool(lessonId).catch((err) =>
      console.error(`[translate] Failed for SW "${lessonId}":`, err.message),
    );
  }

  return {
    id: updated._id,
    title: updated.title,
    level: updated.level,
    topic: updated.topic,
    description: updated.description,
    image: updated.image,
    wordPool: updated.wordPool || [],
    minWordCount: updated.minWordCount,
    maxWordCount: updated.maxWordCount,
    updatedAt: updated.updatedAt,
  };
}

/**
 * DELETE /writing/see-and-write/:id — Delete lesson
 */
export async function deleteLesson(lessonId) {
  const lesson = await SeeWrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");
  await SeeWrite.findByIdAndDelete(lessonId);
  return { id: lessonId };
}

async function translateWordPool(lessonId) {
  const lesson = await SeeWrite.findById(lessonId);
  if (!lesson || !lesson.wordPool?.length) return;

  const words = lesson.wordPool.map((w) => w.word);
  const { result } = await aiTranslateKeywords(words);
  const meaningMap = {};
  for (const item of result.translations) {
    meaningMap[item.word.toLowerCase()] = item.viMeaning;
  }

  lesson.wordPool = lesson.wordPool.map((w) => ({
    word: w.word,
    meaning: meaningMap[w.word.toLowerCase()] || "",
    isRequired: w.isRequired,
  }));
  lesson.markModified("wordPool");
  await lesson.save();
}
