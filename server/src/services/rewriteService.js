import { Rewrite } from "@server/models/writing/Rewrite";
import { Attempt } from "@server/models/attempt/Attempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeRewrite } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmissions,
  getSubmissions,
  buildSentenceAttempts,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";

/**
 * GET /writing/rewrite — List lessons
 */
export async function listLessons(filters, pagination) {
  const { level, topic } = filters;
  const { page, limit } = pagination;

  const query = {
    ...(level && { level }),
    ...(topic && { topic }),
  };

  const [lessons, total] = await Promise.all([
    Rewrite.find(query)
      .select("title level topic totalSentences createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Rewrite.countDocuments(query),
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
 * GET /writing/rewrite/:lessonId — Lesson detail
 */
export async function getLesson(lessonId) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    totalSentences: lesson.totalSentences,
    sentences: (lesson.sentences || []).map((s) => ({
      order: s.order,
      targetSentence: s.targetSentence,
    })),
  };
}

/**
 * GET /writing/rewrite/:lessonId/attempt — Upsert + return attempt
 */
export async function getAttempt(userId, lessonId) {
  const attempt = await findOrCreateAttempt(userId, lessonId, "Rewrite");
  const lastSubMap = await getLastSubmissions(attempt._id);

  return {
    id: attempt._id,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    sentenceAttempts: buildSentenceAttempts(attempt.sentenceProgress, lastSubMap),
  };
}

/**
 * POST /writing/rewrite/:lessonId/submit — Grade answer
 */
export async function submitAnswer(userId, lessonId, sentenceOrder, userAnswer) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const sentence = (lesson.sentences || []).find((s) => s.order === sentenceOrder);
  if (!sentence) throw ApiError.badRequest(`Sentence order ${sentenceOrder} not found`);

  const { result: grading, provider } = await aiGradeRewrite(
    userAnswer,
    sentence.targetSentence,
    lesson.level,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));

  const attempt = await findOrCreateAttempt(userId, lessonId, "Rewrite");
  const { submission, progress } = await submitAndUpdateProgress(attempt, {
    sentenceOrder,
    userAnswer,
    score,
    gradedBy: provider,
    feedback: {
      summary: grading.summary,
      criteria: grading.criteria || [],
      corrections: grading.corrections || [],
      modelAnswer: grading.modelAnswer || null,
    },
    isCompleted: score >= COMPLETION_THRESHOLD,
    totalSentences: lesson.totalSentences,
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
 * GET /writing/rewrite/:lessonId/progress
 */
export async function getProgress(userId, lessonId) {
  const attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  const lastSubMap = await getLastSubmissions(attempt._id);

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    completedAt: attempt.completedAt,
    sentenceAttempts: buildSentenceAttempts(attempt.sentenceProgress, lastSubMap),
  };
}

/**
 * GET /writing/rewrite/:lessonId/history
 */
export async function getHistory(userId, lessonId, { page = 1, limit = 20 } = {}) {
  const attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  const { docs, total } = await getSubmissions(attempt._id, { page, limit });

  const grouped = {};
  for (const sub of docs) {
    if (!grouped[sub.sentenceOrder]) grouped[sub.sentenceOrder] = [];
    grouped[sub.sentenceOrder].push(sub);
  }

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    sentenceAttempts: attempt.sentenceProgress.map((p) => ({
      sentenceOrder: p.sentenceOrder,
      attemptCount: p.attemptCount,
      bestScore: p.bestScore,
      isCompleted: p.isCompleted,
      submissions: (grouped[p.sentenceOrder] || []).reverse(),
    })),
    pagination: { page, limit, total },
  };
}
