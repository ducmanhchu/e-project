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
      id: ref.id,
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
    completedAt: attempt.completedAt || null,
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
      suggestion: grading.suggestion || "",
      improvements: grading.improvements || [],
      comment: grading.comment || "",
    },
    isCompleted: score >= COMPLETION_THRESHOLD,
    totalSentences: lesson.totalSentences,
    keepOnlyLast: true,
  });

  return {
    score,
    feedback: submission.feedback,
    gradedBy: provider,
    isCompleted: score >= COMPLETION_THRESHOLD,
  };
}


/**
 * PUT /writing/reverse-translation/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const lesson = await ReverseTranslation.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const allowedFields = ["title", "level", "topic", "contentType", "description"];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (body.sentences !== undefined) {
    const { sentences } = body;
    if (!Array.isArray(sentences) || sentences.length === 0) {
      throw ApiError.badRequest("sentences must be a non-empty array");
    }
    updates.sentences = sentences.map((s, i) => ({
      order: i + 1,
      vietnameseText: s.vietnameseText,
      referenceAnswer: s.referenceAnswer,
    }));
    updates.totalSentences = updates.sentences.length;
  }

  if (body.vietnameseParagraph !== undefined) {
    updates.vietnameseParagraph = body.vietnameseParagraph;
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const updated = await ReverseTranslation.findByIdAndUpdate(
    lessonId,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  return {
    id: updated._id,
    title: updated.title,
    level: updated.level,
    topic: updated.topic,
    contentType: updated.contentType,
    description: updated.description,
    totalSentences: updated.totalSentences,
    updatedAt: updated.updatedAt,
  };
}

/**
 * DELETE /writing/reverse-translation/:id — Delete lesson
 */
export async function deleteLesson(lessonId) {
  const lesson = await ReverseTranslation.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");
  await ReverseTranslation.findByIdAndDelete(lessonId);
  return { id: lessonId };
}
