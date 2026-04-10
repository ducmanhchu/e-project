import { SeeWrite } from "@server/models/writing/SeeWrite";
import { ApiError } from "@server/helpers/ApiError";
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";

/**
 * GET /admin/writing/see-and-write — List all lessons (admin view)
 */
export async function listLessons({ page = 1, limit = 20 } = {}) {
  const [lessons, total] = await Promise.all([
    SeeWrite.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SeeWrite.countDocuments(),
  ]);

  return {
    items: lessons.map((l) => ({
      id: l._id,
      title: l.title,
      level: l.level,
      topic: l.topic,
      mediaUrl: l.mediaUrl,
      requiredWords: l.requiredWords || [],
      wordPool: l.wordPool || [],
      minWordCount: l.minWordCount,
      maxWordCount: l.maxWordCount,
      totalSentences: l.totalSentences,
      createdAt: l.createdAt,
    })),
    total,
    page,
    limit,
  };
}

/**
 * GET /admin/writing/see-and-write/:id — Full lesson data (no shuffle)
 */
export async function getLessonAdmin(lessonId) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    description: lesson.description,
    mediaUrl: lesson.mediaUrl,
    requiredWords: lesson.requiredWords || [],
    wordPool: lesson.wordPool || [],
    minWordCount: lesson.minWordCount,
    maxWordCount: lesson.maxWordCount,
    sortOrder: lesson.sortOrder,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

/**
 * POST /admin/writing/see-and-write — Create lesson
 * Delegates to writingService.createWriting with type = see_and_write
 */
export async function createLesson(body) {
  return createWriting({ ...body, type: WRITING_TYPE.SEE_AND_WRITE });
}

/**
 * PUT /admin/writing/see-and-write/:id — Update lesson
 */
export async function updateLesson(lessonId, body) {
  const lesson = await SeeWrite.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const allowedFields = [
    "title", "level", "topic", "description", "sortOrder",
    "mediaUrl", "requiredWords", "minWordCount", "maxWordCount",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Recompute wordPool if requiredWords or distractorWords changed
  if (body.requiredWords !== undefined || body.distractorWords !== undefined) {
    const requiredWords = body.requiredWords ?? lesson.requiredWords ?? [];
    const distractorWords = body.distractorWords ?? computeDistractorWords(lesson) ?? [];
    updates.wordPool = [...requiredWords, ...distractorWords];
    updates.requiredWords = requiredWords;
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const updated = await SeeWrite.findByIdAndUpdate(
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
    mediaUrl: updated.mediaUrl,
    requiredWords: updated.requiredWords || [],
    wordPool: updated.wordPool || [],
    minWordCount: updated.minWordCount,
    maxWordCount: updated.maxWordCount,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Compute distractor words from wordPool - requiredWords
 */
function computeDistractorWords(lesson) {
  const requiredSet = new Set((lesson.requiredWords || []).map((w) => w.toLowerCase()));
  return (lesson.wordPool || []).filter((w) => !requiredSet.has(w.toLowerCase()));
}
