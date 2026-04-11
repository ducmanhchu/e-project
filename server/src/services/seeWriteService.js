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
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /writing/see-and-write — List lessons
 */
export async function listLessons(filters, pagination) {
  const { level, topic } = filters;
  const { page, limit } = pagination;

  const query = {
    ...(level && { level }),
    ...(topic && { topic }),
  };

  const [lessons, total] = await Promise.all([
    SeeWrite.find(query)
      .select("title level topic totalSentences createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SeeWrite.countDocuments(query),
  ]);

  return {
    items: lessons.map((lesson) => ({
      id: lesson._id,
      title: lesson.title,
      level: lesson.level,
      topic: lesson.topic,

      totalSentences: lesson.totalSentences,
      createdAt: lesson.createdAt,
    })),
    total,
  };
}

/**
 * GET /writing/see-and-write/:lessonId — Lesson detail
 */
export async function getLesson(lessonId) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    mediaUrl: lesson.mediaUrl,
    wordPool: shuffleArray(lesson.wordPool || []),
    keywordCount: (lesson.requiredWords || []).length,
    minWordCount: lesson.minWordCount || null,
    maxWordCount: lesson.maxWordCount || null,
    totalSentences: lesson.totalSentences,
  };
}

/**
 * GET /writing/see-and-write/:lessonId/attempt — Upsert + return attempt
 */
export async function getAttempt(userId, lessonId) {
  const attempt = await findOrCreateAttempt(userId, lessonId, "SeeWrite");

  const progress = attempt.sentenceProgress.find((p) => p.sentenceOrder === 1);
  const lastSub = progress
    ? await getLastSubmission(attempt._id, 1)
    : null;

  return {
    id: attempt._id,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    keywordQuiz: attempt.keywordQuiz || null,
    sentenceAttempts: progress
      ? [{
          sentenceOrder: 1,
          attemptCount: progress.attemptCount,
          bestScore: progress.bestScore,
          isCompleted: progress.isCompleted,
          lastSubmission: lastSub,
        }]
      : [],
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

  const correctSet = new Set(
    (lesson.requiredWords || []).map((w) => w.toLowerCase()),
  );
  const selectedSet = new Set(
    selectedKeywords.map((w) => w.toLowerCase()),
  );

  const results = { correct: [], missed: [], wrong: [] };

  for (const word of lesson.requiredWords || []) {
    if (selectedSet.has(word.toLowerCase())) {
      results.correct.push(word);
    } else {
      results.missed.push(word);
    }
  }

  for (const word of selectedKeywords) {
    if (!correctSet.has(word.toLowerCase())) {
      results.wrong.push(word);
    }
  }

  const quizScore = Math.round(
    (results.correct.length / (lesson.requiredWords?.length || 1)) * 100,
  );

  // Check cached translations first
  const attempt = await findOrCreateAttempt(userId, lessonId, "SeeWrite");
  let translations = attempt.keywordQuiz?.translations || null;
  let translatedBy = "cached";

  if (!translations) {
    const allWords = lesson.wordPool || [];
    const { result: aiResult, provider } = await aiTranslateKeywords(allWords);
    translations = {};
    for (const item of aiResult.translations) {
      translations[item.word.toLowerCase()] = item.viMeaning;
    }
    translatedBy = provider;
  }

  // Save quiz result + translations cache
  attempt.keywordQuiz = {
    selectedKeywords,
    correct: results.correct,
    missed: results.missed,
    wrong: results.wrong,
    score: quizScore,
    translations,
  };
  await attempt.save();

  return {
    results,
    score: quizScore,
    translations,
    translatedBy,
  };
}

/**
 * POST /writing/see-and-write/:lessonId/submit — Grade answer
 */
export async function submitAnswer(userId, lessonId, userAnswer) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  // Enforce quiz if lesson has requiredWords
  const hasKeywords = (lesson.requiredWords || []).length > 0;
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
    isCompleted: progress.isCompleted,
  };
}

/**
 * GET /writing/see-and-write/:lessonId/progress
 */
export async function getProgress(userId, lessonId) {
  const attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    completedAt: attempt.completedAt,
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
    pagination: { page, limit, total },
  };
}
