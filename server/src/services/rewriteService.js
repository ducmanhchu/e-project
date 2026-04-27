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
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";
import { validateFields } from "@server/helpers/validateFields";

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
    completedAt: attempt.completedAt || null,
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
      suggestion: grading.suggestion || "",
      improvements: grading.improvements || [],
      comment: grading.comment || "",
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
    isCompleted: score >= COMPLETION_THRESHOLD,
  };
}

/**
 * GET /writing/rewrite — Admin list (all lessons, full data)
 */
export async function listLessonsAdmin({ page = 1, limit = 20 } = {}) {
  const [lessons, total] = await Promise.all([
    Rewrite.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Rewrite.countDocuments(),
  ]);

  return {
    items: lessons.map((l) => ({
      id: l._id,
      title: l.title,
      level: l.level,
      topic: l.topic,
      totalSentences: l.totalSentences,
      sentences: l.sentences || [],
      createdAt: l.createdAt,
    })),
    total,
  };
}

/**
 * GET /writing/rewrite/:id — Admin detail (full data)
 */
export async function getLessonAdmin(lessonId) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    description: lesson.description,
    sentences: lesson.sentences || [],
    totalSentences: lesson.totalSentences,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

/**
 * POST /writing/rewrite — Create lesson
 */
export async function createLesson(body) {
  return createWriting({ ...body, type: WRITING_TYPE.PARAPHRASING });
}

/**
 * PUT /writing/rewrite/:id — Update lesson
 */
/**
 * DELETE /writing/rewrite/:id — Delete lesson
 */
export async function deleteLesson(lessonId) {
  const lesson = await Rewrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");
  await Rewrite.findByIdAndDelete(lessonId);
  return { id: lessonId };
}

/**
 * PUT /writing/rewrite/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const lesson = await Rewrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const allowedFields = [
    "title", "level", "topic", "description",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (body.sentences !== undefined) {
    const { sentences } = body;
    if (!Array.isArray(sentences) || sentences.length === 0) {
      throw ApiError.badRequest("sentences must be a non-empty array");
    }

    updates.sentences = sentences.map((s, i) => {
      validateFields(s, ["targetSentence"]);
      return {
        order: i + 1,
        targetSentence: s.targetSentence.trim(),
      };
    });
    updates.totalSentences = updates.sentences.length;
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const updated = await Rewrite.findByIdAndUpdate(
    lessonId,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  return {
    id: updated._id,
    title: updated.title,
    level: updated.level,
    topic: updated.topic,
    description: updated.description,
    sentences: updated.sentences || [],
    totalSentences: updated.totalSentences,
    updatedAt: updated.updatedAt,
  };
}
