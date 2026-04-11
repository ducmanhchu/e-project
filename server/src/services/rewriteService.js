import { Rewrite } from "@server/models/writing/Rewrite";
import { ExerciseAttempt } from "@server/models/exerciseAttempt/ExerciseAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeRewrite } from "@server/services/ai/gradingProvider";

const COMPLETION_THRESHOLD = 70;

/**
 * GET /writing/rewrite — List lessons
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
    Rewrite.find(query)
      .select("title level topic contentType totalSentences createdAt")
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
      contentType: lesson.contentType,
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
    contentType: lesson.contentType,
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
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "Rewrite",
      sentenceAttempts: [],
    });
  }

  const sentenceAttempts = attempt.sentenceAttempts.map((sa) => ({
    sentenceOrder: sa.sentenceOrder,
    attemptCount: sa.attemptCount,
    bestScore: sa.bestScore,
    isCompleted: sa.isCompleted,
    lastSubmission:
      sa.submissions.length > 0
        ? sa.submissions[sa.submissions.length - 1]
        : null,
  }));

  return {
    id: attempt._id,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    sentenceAttempts,
  };
}

/**
 * POST /writing/rewrite/:lessonId/submit — Grade answer
 */
export async function submitAnswer(userId, lessonId, sentenceOrder, userAnswer) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const sentences = lesson.sentences || [];
  const sentence = sentences.find((s) => s.order === sentenceOrder);
  if (!sentence) {
    throw ApiError.badRequest(`Sentence order ${sentenceOrder} not found`);
  }

  const { result: grading, provider } = await aiGradeRewrite(
    userAnswer,
    sentence.targetSentence,
    lesson.level,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));
  const isNowCompleted = score >= COMPLETION_THRESHOLD;

  const submission = {
    userAnswer,
    score,
    feedback: {
      summary: grading.summary,
      criteria: grading.criteria || [],
      corrections: grading.corrections || [],
      modelAnswer: grading.modelAnswer || null,
    },
    gradedBy: provider,
    submittedAt: new Date(),
  };

  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "Rewrite",
      sentenceAttempts: [],
    });
  }

  let sa = attempt.sentenceAttempts.find((s) => s.sentenceOrder === sentenceOrder);
  if (!sa) {
    attempt.sentenceAttempts.push({
      sentenceOrder,
      submissions: [],
      bestScore: 0,
      attemptCount: 0,
      isCompleted: false,
    });
    sa = attempt.sentenceAttempts[attempt.sentenceAttempts.length - 1];
  }

  sa.submissions.push(submission);
  sa.attemptCount += 1;
  if (score > sa.bestScore) sa.bestScore = score;
  if (isNowCompleted) sa.isCompleted = true;

  const completedCount = attempt.sentenceAttempts.filter((s) => s.isCompleted).length;
  attempt.completedSentences = completedCount;

  const scoredAttempts = attempt.sentenceAttempts.filter((s) => s.attemptCount > 0);
  attempt.totalScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((sum, s) => sum + s.bestScore, 0) / scoredAttempts.length,
        )
      : 0;

  if (completedCount >= lesson.totalSentences && attempt.status !== "completed") {
    attempt.status = "completed";
    attempt.completedAt = new Date();
  }

  await attempt.save();

  return {
    score,
    feedback: submission.feedback,
    gradedBy: provider,
    bestScore: sa.bestScore,
    isCompleted: sa.isCompleted,
  };
}

/**
 * GET /writing/rewrite/:lessonId/progress
 */
export async function getProgress(userId, lessonId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    completedAt: attempt.completedAt,
    sentenceAttempts: attempt.sentenceAttempts.map((sa) => ({
      sentenceOrder: sa.sentenceOrder,
      attemptCount: sa.attemptCount,
      bestScore: sa.bestScore,
      isCompleted: sa.isCompleted,
      lastSubmission:
        sa.submissions.length > 0
          ? sa.submissions[sa.submissions.length - 1]
          : null,
    })),
  };
}

/**
 * GET /writing/rewrite/:lessonId/history
 */
export async function getHistory(userId, lessonId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    sentenceAttempts: attempt.sentenceAttempts.map((sa) => ({
      sentenceOrder: sa.sentenceOrder,
      attemptCount: sa.attemptCount,
      bestScore: sa.bestScore,
      isCompleted: sa.isCompleted,
      submissions: sa.submissions,
    })),
  };
}
