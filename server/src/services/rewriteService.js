import { Rewrite } from "@server/models/writing/Rewrite";
import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";
import { ApiError } from "@server/helpers/ApiError";
import { chargeForSubmit } from "@server/helpers/chargeForSubmit";
import { aiGradeRewrite } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmissions,
  getSubmissions,
  buildStatusFilter,
} from "@server/helpers/attemptHelper";
import { COMPLETION_THRESHOLD } from "@server/const/exercise";
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";
import { validateFields } from "@server/helpers/validateFields";
import {
  resolveSort,
  buildLessonsListPromise,
  buildTitleSearch,
} from "@server/helpers/writing/listLessonsQuery";

const RW_LIST_PROJECTION = {
  title: 1,
  level: 1,
  topic: 1,
  totalSentences: 1,
  createdAt: 1,
};

/**
 * GET /writing/rewrite — List lessons + user's attempt summary
 */
export async function listLessons(filters, pagination, userId) {
  const { level, topic, search, status } = filters;
  const { page, limit } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const statusFilter = await buildStatusFilter({
    userId,
    lessonType: "Rewrite",
    statuses: status,
  });
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
    ...(statusFilter || {}),
  };

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(Rewrite, {
      query,
      projection: RW_LIST_PROJECTION,
      sortBy,
      order,
      page,
      limit,
    }),
    Rewrite.countDocuments(query),
  ]);

  const attemptMap = new Map();
  if (userId && lessons.length > 0) {
    const attempts = await Attempt.find({
      userId,
      lessonId: { $in: lessons.map((l) => l._id) },
      lessonType: "Rewrite",
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
 * GET /writing/rewrite/:id — Lesson + user's attempt (merged)
 */
export async function getLesson(lessonId, userId) {
  const lesson = await Rewrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const attempt = await Attempt.findOne({
    userId,
    lessonId,
    lessonType: "Rewrite",
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
    totalSentences: lesson.totalSentences,
    status: attempt?.status ?? "not_started",
    completedSentences: attempt?.completedSentences ?? 0,
    completedAt: attempt?.completedAt ?? null,
    sentences: (lesson.sentences || []).map((s) => {
      const progress = progressMap.get(s.order);
      return {
        order: s.order,
        targetSentence: s.targetSentence,
        isCompleted: progress?.isCompleted ?? false,
        lastSubmission: progress ? lastSubMap.get(s.order) ?? null : null,
      };
    }),
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

  return chargeForSubmit(
    {
      userId,
      reason: `submit rewrite ${lessonId}/${sentenceOrder}`,
      referenceType: "Attempt",
      referenceId: lessonId,
    },
    async () => {
      const { result: grading, provider } = await aiGradeRewrite(
        userAnswer,
        sentence.targetSentence,
        lesson.level,
      );

      const score = Math.min(100, Math.max(0, Math.round(grading.score)));

      const attempt = await findOrCreateAttempt(userId, lessonId, "Rewrite");
      const { submission } = await submitAndUpdateProgress(attempt, {
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
        isCompleted: score >= COMPLETION_THRESHOLD,
      };
    },
  );
}

/**
 * GET /writing/rewrite — Admin list (with filter + sort, full data)
 */
export async function adminListLessons(filters = {}, pagination = {}) {
  const { level, topic, search } = filters;
  const { page = 1, limit = 20 } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(titleFilter && { title: titleFilter }),
  };

  const adminProjection = {
    title: 1,
    level: 1,
    topic: 1,
    totalSentences: 1,
    sentences: 1,
    createdAt: 1,
  };

  const [lessons, total] = await Promise.all([
    buildLessonsListPromise(Rewrite, {
      query,
      projection: adminProjection,
      sortBy,
      order,
      page,
      limit,
    }),
    Rewrite.countDocuments(query),
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
export async function adminGetLesson(lessonId) {
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
 * DELETE /admin/writing/rewrite?ids=a,b,c — Bulk delete + cascade
 */
export async function bulkDeleteLessons(ids) {
  const docs = await Rewrite.find({ _id: { $in: ids } })
    .select("_id")
    .lean();
  if (docs.length === 0) return { deleted: 0 };

  const docIds = docs.map((d) => d._id);
  const attempts = await Attempt.find({
    lessonId: { $in: docIds },
    lessonType: "Rewrite",
  })
    .select("_id")
    .lean();
  const attemptIds = attempts.map((a) => a._id);

  await Promise.all([
    Rewrite.deleteMany({ _id: { $in: docIds } }),
    attemptIds.length
      ? Submission.deleteMany({ attemptId: { $in: attemptIds } })
      : Promise.resolve(),
    attemptIds.length
      ? Attempt.deleteMany({ _id: { $in: attemptIds } })
      : Promise.resolve(),
  ]);

  return { deleted: docs.length };
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

