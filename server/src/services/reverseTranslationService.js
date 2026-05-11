import { ReverseTranslation } from "@server/models/writing/ReverseTranslation";
import { Attempt } from "@server/models/attempt/Attempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeAnswer } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmissions,
  getSubmissions,
  buildStatusFilter,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";
import {
  resolveSort,
  buildLessonsListPromise,
  buildTitleSearch,
} from "@server/helpers/writing/listLessonsQuery";

const RT_LIST_PROJECTION = {
  title: 1,
  level: 1,
  topic: 1,
  contentType: 1,
  totalSentences: 1,
  createdAt: 1,
};

/**
 * GET /writing/reverse-translation — List published lessons + user's attempt summary
 */
export async function listLessons(filters, pagination, userId) {
  const { level, contentType, topic, search, status } = filters;
  const { page, limit } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const statusFilter = await buildStatusFilter({
    userId,
    lessonType: "ReverseTranslation",
    statuses: status,
  });
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(contentType && { contentType }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
    ...(statusFilter || {}),
  };

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(ReverseTranslation, {
      query,
      projection: RT_LIST_PROJECTION,
      sortBy,
      order,
      page,
      limit,
    }),
    ReverseTranslation.countDocuments(query),
  ]);

  const attemptMap = new Map();
  if (userId && lessons.length > 0) {
    const attempts = await Attempt.find({
      userId,
      lessonId: { $in: lessons.map((l) => l._id) },
      lessonType: "ReverseTranslation",
    })
      .select("lessonId status completedSentences completedAt")
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
        contentType: lesson.contentType,
        totalSentences: lesson.totalSentences,
        createdAt: lesson.createdAt,
        status: a?.status ?? "not_started",
        completedSentences: a?.completedSentences ?? 0,
        completedAt: a?.completedAt ?? null,
      };
    }),
    total,
  };
}

/**
 * GET /writing/reverse-translation/:id — Lesson + user's attempt (merged)
 */
export async function getLesson(lessonId, userId) {
  const lesson = await ReverseTranslation.findOne({ _id: lessonId }).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const attempt = await Attempt.findOne({
    userId,
    lessonId,
    lessonType: "ReverseTranslation",
  }).lean();
  const lastSubMap = attempt
    ? await getLastSubmissions(attempt._id)
    : new Map();
  const progressMap = new Map(
    (attempt?.sentenceProgress || []).map((p) => [p.sentenceOrder, p]),
  );

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    contentType: lesson.contentType,
    totalSentences: lesson.totalSentences,
    vietnameseParagraph: lesson.vietnameseParagraph || null,
    vocabularyRefs: (lesson.vocabularyRefs || []).map((ref) => ({
      id: ref.id,
      sentenceIndex: ref.sentenceIndex ?? null,
    })),
    status: attempt?.status ?? "not_started",
    completedSentences: attempt?.completedSentences ?? 0,
    completedAt: attempt?.completedAt ?? null,
    sentences: (lesson.sentences || []).map((s) => {
      const progress = progressMap.get(s.order);
      return {
        order: s.order,
        vietnameseText: s.vietnameseText,
        isCompleted: progress?.isCompleted ?? false,
        lastSubmission: lastSubMap.get(s.order) || null,
      };
    }),
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

/**
 * Admin: list lessons (identical to listLessons for now; isolated for future divergence).
 * Strips `status` because that filter is per-user — admin has no userId so it would
 * silently fall into guest mode and return empty for in_progress/completed.
 */
export async function adminListLessons(filters = {}, pagination) {
  const adminFilters = { ...filters };
  delete adminFilters.status;
  return listLessons(adminFilters, pagination);
}

/**
 * Admin: get full lesson with referenceAnswer + populated vocabulary
 */
export async function adminGetLesson(lessonId) {
  const lesson = await ReverseTranslation.findById(lessonId)
    .populate({
      path: "vocabularyRefs.id",
      select: "word partOfSpeech ipa definitions",
    })
    .lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  return {
    id: lesson._id,
    title: lesson.title,
    description: lesson.description || "",
    level: lesson.level,
    topic: lesson.topic,
    contentType: lesson.contentType,
    totalSentences: lesson.totalSentences,
    vietnameseParagraph: lesson.vietnameseParagraph || "",
    sentences: (lesson.sentences || []).map((s) => ({
      order: s.order,
      vietnameseText: s.vietnameseText,
      referenceAnswer: s.referenceAnswer,
    })),
    vocabulary: (lesson.vocabularyRefs || [])
      .filter((ref) => ref.id)
      .map((ref) => ({
        vocabularyId: ref.id._id,
        word: ref.id.word,
        partOfSpeech: ref.id.partOfSpeech || "",
        ipa: ref.id.ipa || "",
        definitions: ref.id.definitions || [],
        sentenceIndex: ref.sentenceIndex ?? null,
      })),
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}
