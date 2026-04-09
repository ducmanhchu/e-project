import { ReverseTranslation } from "@server/models/writing/ReverseTranslation";
import { ExerciseAttempt } from "@server/models/exerciseAttempt/ExerciseAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeAnswer } from "@server/services/ai/gradingProvider";

const COMPLETION_THRESHOLD = 70;

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
      .select(
        "title level topic contentType totalSentences createdAt",
      )
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
 * GET /attempts — List all user attempts (optionally filter by lessonIds)
 */
export async function listAttempts(userId, lessonIds) {
  const query = { userId };
  if (lessonIds && lessonIds.length > 0) {
    query.lessonId = { $in: lessonIds };
  }

  const attempts = await ExerciseAttempt.find(query)
    .select("lessonId status completedSentences totalScore")
    .lean();

  return attempts.map((a) => ({
    lessonId: a.lessonId,
    status: a.status,
    completedSentences: a.completedSentences,
    totalScore: a.totalScore,
  }));
}

/**
 * GET /writing/reverse-translation/:id — Lesson data only
 */
export async function getLesson(lessonId) {
  const lesson = await ReverseTranslation.findOne({
    _id: lessonId,
  }).lean();

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
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "ReverseTranslation",
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
 * Submit answer for a sentence — AI grades it
 */
export async function submitAnswer(
  userId,
  lessonId,
  sentenceOrder,
  userAnswer,
) {
  // Use .lean() to get raw data including referenceAnswer (toJSON strips it)
  const lesson = await ReverseTranslation.findOne({
    _id: lessonId,
  }).lean();

  if (!lesson) throw ApiError.notFound("Lesson not found");

  const sentences = lesson.sentences || [];
  const sentence = sentences.find((s) => s.order === sentenceOrder);
  if (!sentence)
    throw ApiError.badRequest(`Sentence order ${sentenceOrder} not found`);

  // AI grading
  const { result: grading, provider } = await aiGradeAnswer(
    userAnswer,
    sentence.referenceAnswer,
    sentence.vietnameseText,
    lesson.level,
    lesson.contentType,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));
  const isNowCompleted = score >= COMPLETION_THRESHOLD;

  const submission = {
    userAnswer,
    score,
    feedback: {
      summary: grading.summary,
      strengths: grading.strengths || [],
      improvements: grading.improvements || [],
    },
    gradedBy: provider,
    submittedAt: new Date(),
  };

  // Upsert attempt + push submission atomically
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "ReverseTranslation",
      sentenceAttempts: [],
    });
  }

  // Find or create sentenceAttempt
  let sa = attempt.sentenceAttempts.find(
    (s) => s.sentenceOrder === sentenceOrder,
  );
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

  // Recalculate attempt-level stats
  const completedCount = attempt.sentenceAttempts.filter(
    (s) => s.isCompleted,
  ).length;
  attempt.completedSentences = completedCount;

  const scoredAttempts = attempt.sentenceAttempts.filter(
    (s) => s.attemptCount > 0,
  );
  attempt.totalScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((sum, s) => sum + s.bestScore, 0) /
            scoredAttempts.length,
        )
      : 0;

  // Check overall completion
  if (
    completedCount >= lesson.totalSentences &&
    attempt.status !== "completed"
  ) {
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
 * Get exercise progress (attempt only, no lesson query)
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
 * Get full submission history for a sentence
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
