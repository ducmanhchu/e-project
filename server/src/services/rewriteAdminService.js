import { Rewrite } from "@server/models/writing/Rewrite";
import { ApiError } from "@server/helpers/ApiError";
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";
import { validateFields } from "@server/helpers/validateFields";

/**
 * GET /admin/writing/rewrite — List all lessons (admin view)
 */
export async function listLessons({ page = 1, limit = 20 } = {}) {
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
      contentType: l.contentType,
      totalSentences: l.totalSentences,
      sentences: l.sentences || [],
      createdAt: l.createdAt,
    })),
    total,
    page,
    limit,
  };
}

/**
 * GET /admin/writing/rewrite/:id — Full lesson data
 */
export async function getLessonAdmin(lessonId) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    contentType: lesson.contentType,
    description: lesson.description,
    sentences: lesson.sentences || [],
    totalSentences: lesson.totalSentences,
    sortOrder: lesson.sortOrder,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

/**
 * POST /admin/writing/rewrite — Create lesson
 */
export async function createLesson(body) {
  return createWriting({ ...body, type: WRITING_TYPE.PARAPHRASING });
}

/**
 * PUT /admin/writing/rewrite/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const lesson = await Rewrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const allowedFields = [
    "title", "level", "topic", "description", "contentType", "sortOrder",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Handle sentences update with validation + recalculate totalSentences
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
    contentType: updated.contentType,
    description: updated.description,
    sentences: updated.sentences || [],
    totalSentences: updated.totalSentences,
    sortOrder: updated.sortOrder,
    updatedAt: updated.updatedAt,
  };
}
