import { Exam } from "@server/models/writing/Exam";
import { Attempt } from "@server/models/attempt/Attempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeExam } from "@server/services/ai/gradingProvider";
import {
  findOrCreateAttempt,
  submitAndUpdateProgress,
  getLastSubmission,
  getSubmissions,
} from "@server/helpers/attemptHelper";
import { COMPLETION_BAND, EXAM_MIN_WORDS, bandToScore, roundBand } from "@server/const/exercise";

/**
 * GET /writing/exam — List exams
 */
export async function listExams(filters, pagination) {
  const { level, topic, examType } = filters;
  const { page, limit } = pagination;

  const query = {
    ...(level && { level }),
    ...(topic && { topic }),
    ...(examType && { examType }),
  };

  const [exams, total] = await Promise.all([
    Exam.find(query)
      .select("title level topic examType totalSentences createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Exam.countDocuments(query),
  ]);

  return {
    items: exams.map((e) => ({
      id: e._id,
      title: e.title,
      level: e.level,
      topic: e.topic,
      examType: e.examType,
      totalSentences: e.totalSentences,
      createdAt: e.createdAt,
    })),
    total,
  };
}

/**
 * GET /writing/exam/:examId — Exam detail
 */
export async function getExam(examId) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw ApiError.notFound("Exam not found");

  return {
    id: exam._id,
    title: exam.title,
    level: exam.level,
    topic: exam.topic,
    examType: exam.examType,
    examPrompt: exam.examPrompt,
    imageUrl: exam.imageUrl || null,
    minWordCount: EXAM_MIN_WORDS[exam.examType],
    totalSentences: exam.totalSentences,
  };
}

/**
 * GET /writing/exam/:examId/attempt — Upsert + return attempt
 */
export async function getAttempt(userId, examId) {
  const attempt = await findOrCreateAttempt(userId, examId, "Exam");

  const progress = attempt.sentenceProgress.find((p) => p.sentenceOrder === 1);
  const lastSub = progress
    ? await getLastSubmission(attempt._id, 1)
    : null;

  return {
    id: attempt._id,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    sentenceAttempts: progress
      ? [{
          sentenceOrder: 1,
          attemptCount: progress.attemptCount,
          bestScore: progress.bestScore,
          isCompleted: progress.isCompleted,
          lastSubmission: lastSub,
        }]
      : [],
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
    isCompleted: progress.isCompleted,
  };
}

/**
 * GET /writing/exam/:examId/progress
 */
export async function getProgress(userId, examId) {
  const attempt = await Attempt.findOne({ userId, lessonId: examId });
  if (!attempt) throw ApiError.notFound("No attempt found for this exam");

  return {
    lessonId: examId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    bestScore: attempt.bestScore,
    completedAt: attempt.completedAt,
  };
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
