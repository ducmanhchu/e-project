import { SeeWrite } from "@server/models/writing/SeeWrite";
import { ExerciseAttempt } from "@server/models/exerciseAttempt/ExerciseAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeSeeWrite } from "@server/services/ai/gradingProvider";
import { aiTranslateKeywords } from "@server/services/ai/keywordProvider";

const COMPLETION_THRESHOLD = 70;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /writing/see-and-write — List lessons
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
    SeeWrite.find(query)
      .select("title level topic contentType totalSentences createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SeeWrite.countDocuments(query),
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
 * GET /writing/see-and-write/:lessonId — Lesson detail
 * Returns shuffled wordPool (no answers exposed)
 */
export async function getLesson(lessonId) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const wordPool = shuffleArray(lesson.wordPool || []);

  return {
    id: lesson._id,
    title: lesson.title,
    level: lesson.level,
    topic: lesson.topic,
    mediaUrl: lesson.mediaUrl,
    wordPool,
    keywordCount: (lesson.requiredWords || []).length,
    minWordCount: lesson.minWordCount || null,
    maxWordCount: lesson.maxWordCount || null,
    totalSentences: lesson.totalSentences,
  };
}

/**
 * GET /writing/see-and-write/:lessonId/attempt — Upsert + return attempt
 */
export async function getAttempt(userId, lessonId) {
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "SeeWrite",
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
    keywordQuiz: attempt.keywordQuiz || null,
    sentenceAttempts,
  };
}

/**
 * POST /writing/see-and-write/:lessonId/check-keywords
 * Validate keyword selections + AI translate + save to attempt
 */
export async function checkKeywords(userId, lessonId, selectedKeywords) {
  if (!Array.isArray(selectedKeywords) || selectedKeywords.length === 0) {
    throw ApiError.badRequest("selectedKeywords must be a non-empty array");
  }

  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  const correctSet = new Set(
    (lesson.requiredWords || []).map((w) => w.toLowerCase()),
  );
  const selectedSet = new Set(
    selectedKeywords.map((w) => w.toLowerCase()),
  );

  const results = { correct: [], missed: [], wrong: [] };

  for (const word of lesson.requiredWords || []) {
    if (selectedSet.has(word.toLowerCase())) {
      results.correct.push(word);
    } else {
      results.missed.push(word);
    }
  }

  for (const word of selectedKeywords) {
    if (!correctSet.has(word.toLowerCase())) {
      results.wrong.push(word);
    }
  }

  const quizScore = Math.round(
    (results.correct.length / (lesson.requiredWords?.length || 1)) * 100,
  );

  // AI batch translate all pool keywords
  const allWords = lesson.wordPool || [];

  const { result: aiResult, provider } = await aiTranslateKeywords(allWords);

  const translations = {};
  for (const item of aiResult.translations) {
    translations[item.word.toLowerCase()] = item.viMeaning;
  }

  // Save quiz result to attempt
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      lessonType: "SeeWrite",
      sentenceAttempts: [],
    });
  }

  attempt.keywordQuiz = {
    selectedKeywords,
    correct: results.correct,
    missed: results.missed,
    wrong: results.wrong,
    score: quizScore,
  };
  await attempt.save();

  return {
    results,
    score: quizScore,
    translations,
    translatedBy: provider,
  };
}

/**
 * POST /writing/see-and-write/:lessonId/submit — Grade answer
 * Passes keyword quiz score to AI grading prompt
 */
export async function submitAnswer(userId, lessonId, userAnswer) {
  const lesson = await SeeWrite.findById(lessonId).lean();
  if (!lesson) throw ApiError.notFound("Lesson not found");

  // Get quiz score from attempt (if exists)
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  const quizScore = attempt?.keywordQuiz?.score ?? null;

  const { result: grading, provider } = await aiGradeSeeWrite(
    userAnswer,
    lesson,
    lesson.level,
    quizScore,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));
  const isNowCompleted = score >= COMPLETION_THRESHOLD;

  const submission = {
    userAnswer,
    score,
    feedback: {
      summary: grading.summary,
      enhancedVersion: grading.enhancedVersion || null,
      criteria: grading.criteria || [],
      corrections: grading.corrections || [],
    },
    gradedBy: provider,
    submittedAt: new Date(),
  };

  if (!attempt) {
    throw ApiError.badRequest("Attempt not found — complete keyword quiz first");
  }

  // SeeWrite always uses sentenceOrder = 1
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
    feedback: submission.feedback,
    gradedBy: provider,
    bestScore: sa.bestScore,
    isCompleted: sa.isCompleted,
  };
}

/**
 * GET /writing/see-and-write/:lessonId/progress
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
  };
}

/**
 * GET /writing/see-and-write/:lessonId/history
 */
export async function getHistory(userId, lessonId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  return {
    lessonId,
    status: attempt.status,
    totalScore: attempt.totalScore,
    submissions: attempt.sentenceAttempts[0]?.submissions || [],
  };
}
