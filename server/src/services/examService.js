import { Exam } from "@server/models/writing/Exam";
import { ExerciseAttempt } from "@server/models/exerciseAttempt/ExerciseAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeExam } from "@server/services/ai/gradingProvider";

const COMPLETION_BAND = 6.0;
const MIN_WORD_COUNT = { ielts_task1: 150, ielts_task2: 250 };

const bandToScore = (band) => Math.round(band * 10);
const roundBand = (band) => Math.round(band * 2) / 2;

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
    minWordCount: MIN_WORD_COUNT[exam.examType],
    totalSentences: exam.totalSentences,
  };
}

/**
 * GET /writing/exam/:examId/attempt — Upsert + return attempt
 */
export async function getAttempt(userId, examId) {
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId: examId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId: examId,
      lessonType: "Exam",
      sentenceAttempts: [],
    });
  }

  const sa = attempt.sentenceAttempts.find((s) => s.sentenceOrder === 1);

  return {
    id: attempt._id,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    sentenceAttempts: sa
      ? [{
          sentenceOrder: 1,
          attemptCount: sa.attemptCount,
          bestScore: sa.bestScore,
          isCompleted: sa.isCompleted,
          lastSubmission: sa.submissions.length > 0
            ? sa.submissions[sa.submissions.length - 1]
            : null,
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

  const { result: grading, provider } = await aiGradeExam(userAnswer, exam);

  const band = roundBand(Math.max(1, Math.min(9, grading.overallBand)));
  const score = bandToScore(band);
  const isNowCompleted = band >= COMPLETION_BAND;

  const submission = {
    userAnswer,
    score,
    feedback: {
      bandScore: band,
      summary: grading.summary,
      enhancedVersion: grading.enhancedVersion || null,
      criteria: grading.criteria || [],
      corrections: grading.corrections || [],
    },
    gradedBy: provider,
    submittedAt: new Date(),
  };

  let attempt = await ExerciseAttempt.findOne({ userId, lessonId: examId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId: examId,
      lessonType: "Exam",
      sentenceAttempts: [],
    });
  }

  let sa = attempt.sentenceAttempts.find((s) => s.sentenceOrder === 1);
  if (!sa) {
    attempt.sentenceAttempts.push({
      sentenceOrder: 1,
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

  attempt.completedSentences = sa.isCompleted ? 1 : 0;
  attempt.totalScore = sa.bestScore;

  if (sa.isCompleted && attempt.status !== "completed") {
    attempt.status = "completed";
    attempt.completedAt = new Date();
  }

  await attempt.save();

  return {
    score,
    bandScore: band,
    feedback: submission.feedback,
    gradedBy: provider,
    bestScore: sa.bestScore,
    bestBand: roundBand(sa.bestScore / 10),
    isCompleted: sa.isCompleted,
  };
}

/**
 * GET /writing/exam/:examId/progress
 */
export async function getProgress(userId, examId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId: examId });
  if (!attempt) throw ApiError.notFound("No attempt found for this exam");

  return {
    lessonId: examId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    completedAt: attempt.completedAt,
  };
}

/**
 * GET /writing/exam/:examId/history
 */
export async function getHistory(userId, examId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId: examId });
  if (!attempt) throw ApiError.notFound("No attempt found for this exam");

  return {
    lessonId: examId,
    status: attempt.status,
    totalScore: attempt.totalScore,
    submissions: attempt.sentenceAttempts[0]?.submissions || [],
  };
}
