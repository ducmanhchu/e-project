import { ReverseTranslation } from "@server/models/writing/ReverseTranslation";
import { Attempt } from "@server/models/attempt/Attempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeAnswer } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmissions,
  getSubmissions,
  buildSentenceAttempts,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";

/**
 * GET /writing/reverse-translation — List published lessons
 */
export async function listLessons(filters, pagination) {
  const { level, contentType, topic } = filters;
  const { page, limit } = pagination;

  const query = {
    ...(level && { level }),
    ...(contentType && { contentType }),
    ...(topic && { topic }),
  };

  const [lessons, total] = await Promise.all([
    ReverseTranslation.find(query)
      .select("title level topic contentType totalSentences createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReverseTranslation.countDocuments(query),
  ]);

  return lessons.map((lesson) => ({
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    contentType: lesson.contentType,
    totalSentences: lesson.totalSentences,
    createdAt: lesson.createdAt,
  }));
}

/**
 * GET /writing/reverse-translation/:id — Lesson data only
 */
export async function getLesson(lessonId) {
  const lesson = await ReverseTranslation.findOne({ _id: lessonId }).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    contentType: lesson.contentType,
    totalSentences: lesson.totalSentences,
    vietnameseParagraph: lesson.vietnameseParagraph || null,
    sentences: (lesson.sentences || []).map((s) => ({
      order: s.order,
      vietnameseText: s.vietnameseText,
    })),
    vocabularyRefs: (lesson.vocabularyRefs || []).map((ref) => ({
      vocabularyId: ref.vocabularyId,
      sentenceIndex: ref.sentenceIndex ?? null,
    })),
  };
}

/**
 * GET /attempts/:lessonId — Upsert + return attempt progress
 */
export async function getAttempt(userId, lessonId) {
  const attempt = await findOrCreateAttempt(userId, lessonId, "ReverseTranslation");
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
 * POST /attempts/:lessonId/submit — Submit answer → AI grade
 */
export async function submitAnswer(userId, lessonId, sentenceOrder, userAnswer) {
  const lesson = await ReverseTranslation.findOne({ _id: lessonId }).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const sentence = (lesson.sentences || []).find((s) => s.order === sentenceOrder);
  if (!sentence) throw ApiError.badRequest(`Sentence order ${sentenceOrder} not found`);

  const { result: grading, provider } = await aiGradeAnswer(
    userAnswer,
    sentence.referenceAnswer,
    sentence.vietnameseText,
    lesson.level,
    lesson.contentType,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));

  const attempt = await findOrCreateAttempt(userId, lessonId, "ReverseTranslation");
  const { submission, progress } = await submitAndUpdateProgress(attempt, {
    sentenceOrder,
    userAnswer,
    score,
    gradedBy: provider,
    feedback: {
      summary: grading.summary,
      strengths: grading.strengths || [],
      improvements: grading.improvements || [],
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
 * GET /attempts/:lessonId/progress
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
 * GET /attempts/:lessonId/history
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
