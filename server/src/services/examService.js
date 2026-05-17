import { Exam } from "@server/models/writing/Exam";
import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";
import { ApiError } from "@server/helpers/ApiError";
import { chargeForSubmit } from "@server/helpers/chargeForSubmit";
import {
  normalizeImageFields,
  destroyCloudinaryImage,
} from "@server/helpers/imageFields";
import { aiGradeExam } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmission,
  getSubmissions,
  buildStatusFilter,
} from "@server/helpers/attemptHelper";
import { COMPLETION_BAND, EXAM_MIN_WORDS, bandToScore, roundBand } from "@server/const/exercise";
import { WRITING_TYPE, WRITING_LEVEL, WRITING_TOPIC } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";
import {
  resolveSort,
  buildLessonsListPromise,
  buildTitleSearch,
} from "@server/helpers/writing/listLessonsQuery";

const EXAM_LIST_PROJECTION = {
  title: 1,
  level: 1,
  topic: 1,
  examType: 1,
  createdAt: 1,
};

/**
 * GET /writing/exam — List exams + user's attempt summary
 */
export async function listExams(filters, pagination, userId) {
  const { level, topic, examType, search, status } = filters;
  const { page, limit } = pagination;
  const { sortBy, order } = resolveSort(filters);

  const titleFilter = buildTitleSearch(search);
  const statusFilter = await buildStatusFilter({
    userId,
    lessonType: "Exam",
    statuses: status,
  });
  const query = {
    ...(level?.length && {
      level: level.length === 1 ? level[0] : { $in: level },
    }),
    ...(topic?.length && {
      topic: topic.length === 1 ? topic[0] : { $in: topic },
    }),
    ...(examType?.length && {
      examType: examType.length === 1 ? examType[0] : { $in: examType },
    }),
    ...(titleFilter && { title: titleFilter }),
    ...(statusFilter || {}),
  };

  const [exams, total] = await Promise.all([
    buildLessonsListPromise(Exam, {
      query,
      projection: EXAM_LIST_PROJECTION,
      sortBy,
      order,
      page,
      limit,
    }),
    Exam.countDocuments(query),
  ]);

  const attemptMap = new Map();
  if (userId && exams.length > 0) {
    const attempts = await Attempt.find({
      userId,
      lessonId: { $in: exams.map((e) => e._id) },
      lessonType: "Exam",
    })
      .select("lessonId status completedSentences bestScore completedAt")
      .lean();
    for (const a of attempts) {
      attemptMap.set(String(a.lessonId), a);
    }
  }

  return {
    items: exams.map((e) => {
      const a = attemptMap.get(String(e._id));
      return {
        id: e._id,
        title: e.title,
        level: e.level,
        topic: e.topic,
        examType: e.examType,
        createdAt: e.createdAt,
        status: a?.status ?? "not_started",
        completedSentences: a?.completedSentences ?? 0,
        bestScore: a?.bestScore ?? 0,
        completedAt: a?.completedAt ?? null,
      };
    }),
    total,
  };
}

/**
 * GET /writing/exam/:id — Exam + user's attempt (merged)
 */
export async function getExam(examId, userId) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw ApiError.notFound("Exam not found");

  const attempt = await Attempt.findOne({
    userId,
    lessonId: examId,
    lessonType: "Exam",
  }).lean();

  const progress = attempt?.sentenceProgress?.find((p) => p.sentenceOrder === 1);
  const lastSubmission = progress
    ? await getLastSubmission(attempt._id, 1)
    : null;

  return {
    id: exam._id,
    title: exam.title,
    level: exam.level,
    topic: exam.topic,
    examType: exam.examType,
    examPrompt: exam.examPrompt,
    imageUrl: exam.imageUrl || null,
    imagePublicId: exam.imagePublicId || null,
    minWordCount: EXAM_MIN_WORDS[exam.examType],
    status: attempt?.status ?? "not_started",
    completedSentences: attempt?.completedSentences ?? 0,
    bestScore: attempt?.bestScore ?? 0,
    completedAt: attempt?.completedAt ?? null,
    lastSubmission,
  };
}

/**
 * POST /writing/exam/:examId/submit — Grade answer
 */
export async function submitAnswer(userId, examId, userAnswer) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw ApiError.notFound("Exam not found");

  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  const minWords = EXAM_MIN_WORDS[exam.examType];
  if (minWords && wordCount < minWords) {
    throw ApiError.badRequest(`Word count ${wordCount} is below IELTS minimum ${minWords}`);
  }

  return chargeForSubmit(
    {
      userId,
      reason: `submit exam ${examId}`,
      referenceType: "Attempt",
      referenceId: examId,
    },
    async () => {
      const { result: grading, provider } = await aiGradeExam(userAnswer, exam);

      const band = roundBand(Math.max(1, Math.min(9, grading.overallBand)));
      const score = bandToScore(band);

      const attempt = await findOrCreateAttempt(userId, examId, "Exam");
      const { submission, progress } = await submitAndUpdateProgress(attempt, {
        sentenceOrder: 1,
        userAnswer,
        score,
        gradedBy: provider,
        feedback: {
          bandScore: band,
          summary: grading.summary,
          enhancedVersion: grading.enhancedVersion || null,
          criteria: grading.criteria || [],
          corrections: grading.corrections || [],
        },
        isCompleted: band >= COMPLETION_BAND,
        totalSentences: 1,
      });

      return {
        score,
        bandScore: band,
        feedback: submission.feedback,
        gradedBy: provider,
        bestScore: progress.bestScore,
        bestBand: roundBand(progress.bestScore / 10),
        isCompleted: band >= COMPLETION_BAND,
      };
    },
  );
}

/**
 * GET /writing/exam/:examId/history
 */
export async function getHistory(userId, examId, { page = 1, limit = 20 } = {}) {
  const attempt = await Attempt.findOne({ userId, lessonId: examId });
  if (!attempt) throw ApiError.notFound("No attempt found for this exam");

  const { docs, total } = await getSubmissions(attempt._id, { sentenceOrder: 1, page, limit });

  return {
    lessonId: examId,
    status: attempt.status,
    bestScore: attempt.bestScore,
    submissions: docs.reverse(),
    pagination: { page, limit, total },
  };
}

/**
 * GET /writing/exam — Admin list (with filter + sort)
 */
export async function adminListExams(filters = {}, pagination = {}) {
  const { level, topic, examType, search } = filters;
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
    ...(examType?.length && {
      examType: examType.length === 1 ? examType[0] : { $in: examType },
    }),
    ...(titleFilter && { title: titleFilter }),
  };

  const adminProjection = {
    title: 1,
    level: 1,
    topic: 1,
    examType: 1,
    examPrompt: 1,
    imageUrl: 1,
    imagePublicId: 1,
    createdAt: 1,
  };

  const [exams, total] = await Promise.all([
    buildLessonsListPromise(Exam, {
      query,
      projection: adminProjection,
      sortBy,
      order,
      page,
      limit,
    }),
    Exam.countDocuments(query),
  ]);

  return {
    items: exams.map((e) => ({
      id: e._id,
      title: e.title,
      level: e.level,
      topic: e.topic,
      examType: e.examType,
      examPrompt: e.examPrompt,
      imageUrl: e.imageUrl || null,
      imagePublicId: e.imagePublicId || null,
      createdAt: e.createdAt,
    })),
    total,
  };
}

/**
 * GET /writing/exam/:id — Admin detail
 */
export async function adminGetExam(examId) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw ApiError.notFound("Exam not found");

  return {
    id: exam._id,
    title: exam.title,
    level: exam.level,
    topic: exam.topic,
    description: exam.description,
    examType: exam.examType,
    examPrompt: exam.examPrompt,
    imageUrl: exam.imageUrl || null,
    imagePublicId: exam.imagePublicId || null,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

/**
 * POST /writing/exam — Create exam
 */
export async function createExam(body) {
  return createWriting({ ...body, type: WRITING_TYPE.EXAM_SIMULATION });
}

/**
 * PUT /writing/exam/:id — Update exam
 */
export async function updateExam(examId, body) {
  const exam = await Exam.findById(examId);
  if (!exam) throw ApiError.notFound("Exam not found");

  const allowedFields = ["title", "level", "topic", "description", "examPrompt"];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  const imgFields = normalizeImageFields(body.imageUrl, body.imagePublicId, "imageUrl");
  Object.assign(updates, imgFields);

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  if (updates.title === "") throw ApiError.badRequest("title cannot be empty");
  if (updates.examPrompt === "") throw ApiError.badRequest("examPrompt cannot be empty");
  if (updates.level && !Object.values(WRITING_LEVEL).includes(updates.level)) {
    throw ApiError.badRequest(`Invalid level: ${updates.level}`);
  }
  if (updates.topic && !Object.values(WRITING_TOPIC).includes(updates.topic)) {
    throw ApiError.badRequest(`Invalid topic: ${updates.topic}`);
  }
  if (exam.examType === "ielts_task1" && "imageUrl" in imgFields && !imgFields.imageUrl) {
    throw ApiError.badRequest("imageUrl is required for IELTS Task 1");
  }

  const oldPublicIdToDestroy =
    "imageUrl" in imgFields &&
    exam.imagePublicId &&
    exam.imagePublicId !== imgFields.imagePublicId
      ? exam.imagePublicId
      : null;

  const updated = await Exam.findByIdAndUpdate(
    examId,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (oldPublicIdToDestroy) await destroyCloudinaryImage(oldPublicIdToDestroy);

  return {
    id: updated._id,
    title: updated.title,
    level: updated.level,
    topic: updated.topic,
    examType: updated.examType,
    examPrompt: updated.examPrompt,
    imageUrl: updated.imageUrl || null,
    imagePublicId: updated.imagePublicId || null,
    updatedAt: updated.updatedAt,
  };
}

/**
 * DELETE /writing/exam/:id — Delete exam + cascade attempts/submissions
 */
export async function deleteExam(examId) {
  const deleted = await Exam.findByIdAndDelete(examId);
  if (!deleted) throw ApiError.notFound("Exam not found");

  if (deleted.imagePublicId) {
    await destroyCloudinaryImage(deleted.imagePublicId);
  }

  const attempts = await Attempt.find({ lessonId: examId, lessonType: "Exam" })
    .select("_id")
    .lean();

  if (attempts.length > 0) {
    const attemptIds = attempts.map((a) => a._id);
    await Promise.all([
      Submission.deleteMany({ attemptId: { $in: attemptIds } }),
      Attempt.deleteMany({ _id: { $in: attemptIds } }),
    ]);
  }

  return { id: examId, deletedAttempts: attempts.length };
}

