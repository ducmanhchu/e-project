import { WritingLesson } from "@server/models/writing/WritingLesson";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ExerciseAttempt } from "@server/models/exerciseAttempt/ExerciseAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { aiGradeAnswer } from "@server/services/ai/gradingProvider";
import { WRITING_TYPE } from "@server/const/writting";

const COMPLETION_THRESHOLD = 70;

/**
 * List published reverse_translation lessons with user progress
 */
export async function listLessons(userId, filters, pagination) {
  const { level, contentType, topic, status } = filters;
  const { page, limit } = pagination;

  const query = {
    isPublished: true,
    type: WRITING_TYPE.REVERSE_TRANSLATION,
    ...(level && { level }),
    ...(contentType && { contentType }),
    ...(topic && { topic }),
  };

  const [lessons, total] = await Promise.all([
    WritingLesson.find(query)
      .select(
        "title level topic contentType totalSentences isPremium createdAt",
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WritingLesson.countDocuments(query),
  ]);

  // Batch fetch user attempts for these lessons
  const lessonIds = lessons.map((l) => l._id);
  const attempts = await ExerciseAttempt.find({
    userId,
    lessonId: { $in: lessonIds },
  })
    .select("lessonId status completedSentences totalScore")
    .lean();

  const attemptMap = new Map(attempts.map((a) => [a.lessonId.toString(), a]));

  let results = lessons.map((lesson) => {
    const attempt = attemptMap.get(lesson._id.toString());
    return {
      id: lesson._id,
      title: lesson.title,
      level: lesson.level,
      topic: lesson.topic,
      contentType: lesson.contentType,
      totalSentences: lesson.totalSentences,
      isPremium: lesson.isPremium,
      createdAt: lesson.createdAt,
      userProgress: attempt
        ? {
            status: attempt.status,
            completedSentences: attempt.completedSentences,
            totalScore: attempt.totalScore,
          }
        : null,
    };
  });

  // Post-query filter by status
  if (status && status !== "all") {
    results = results.filter((r) => {
      if (status === "not_started") return !r.userProgress;
      if (status === "in_progress")
        return r.userProgress?.status === "in_progress";
      if (status === "completed") return r.userProgress?.status === "completed";
      return true;
    });
  }

  return {
    lessons: results,
    pagination: {
      page,
      limit,
      total: status && status !== "all" ? results.length : total,
      totalPages:
        status && status !== "all"
          ? Math.ceil(results.length / limit)
          : Math.ceil(total / limit),
    },
  };
}

/**
 * Get exercise detail + upsert attempt
 */
export async function getExercise(userId, lessonId) {
  const lesson = await WritingLesson.findOne({
    _id: lessonId,
    isPublished: true,
    type: WRITING_TYPE.REVERSE_TRANSLATION,
  }).lean();

  if (!lesson) throw ApiError.notFound("Lesson not found");

  // Get vocabulary for this lesson
  const vocabDocs = await Vocabulary.find({
    "lessons.lessonId": lessonId,
  }).lean();

  // Upsert attempt
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      sentenceAttempts: [],
    });
  }

  // Build response — strip full submissions, only return last per sentence
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
    lesson: {
      id: lesson._id,
      title: lesson.title,
      level: lesson.level,
      topic: lesson.topic,
      contentType: lesson.contentType,
      totalSentences: lesson.totalSentences,
      vietnameseParagraph: lesson.content?.vietnameseParagraph || null,
      sentences: (lesson.content?.sentences || []).map((s) => ({
        order: s.order,
        vietnameseText: s.vietnameseText,
        // explanation hidden until user submits for this sentence
      })),
    },
    vocabulary: vocabDocs.map((v) => {
      const lessonRef = v.lessons.find(
        (l) => l.lessonId.toString() === lessonId.toString(),
      );
      return {
        id: v._id,
        word: v.word,
        partOfSpeech: v.partOfSpeech,
        meaning: v.meaning,
        example: v.example,
        sentenceIndex: lessonRef?.sentenceIndex ?? null,
      };
    }),
    attempt: {
      id: attempt._id,
      status: attempt.status,
      completedSentences: attempt.completedSentences,
      totalScore: attempt.totalScore,
      sentenceAttempts,
    },
  };
}

/**
 * Submit answer for a sentence — AI grades it
 */
export async function submitAnswer(
  userId,
  lessonId,
  sentenceOrder,
  userAnswer,
) {
  // Use .lean() to get raw data including referenceAnswer (toJSON strips it)
  const lesson = await WritingLesson.findOne({
    _id: lessonId,
    isPublished: true,
    type: WRITING_TYPE.REVERSE_TRANSLATION,
  }).lean();

  if (!lesson) throw ApiError.notFound("Lesson not found");

  const sentences = lesson.content?.sentences || [];
  const sentence = sentences.find((s) => s.order === sentenceOrder);
  if (!sentence)
    throw ApiError.badRequest(`Sentence order ${sentenceOrder} not found`);

  // AI grading
  const { result: grading, provider } = await aiGradeAnswer(
    userAnswer,
    sentence.referenceAnswer,
    sentence.vietnameseText,
    lesson.level,
    lesson.contentType,
  );

  const score = Math.min(100, Math.max(0, Math.round(grading.score)));
  const isNowCompleted = score >= COMPLETION_THRESHOLD;

  const submission = {
    userAnswer,
    score,
    feedback: {
      summary: grading.summary,
      strengths: grading.strengths || [],
      improvements: grading.improvements || [],
    },
    gradedBy: provider,
    submittedAt: new Date(),
  };

  // Upsert attempt + push submission atomically
  let attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await ExerciseAttempt.create({
      userId,
      lessonId,
      sentenceAttempts: [],
    });
  }

  // Find or create sentenceAttempt
  let sa = attempt.sentenceAttempts.find(
    (s) => s.sentenceOrder === sentenceOrder,
  );
  if (!sa) {
    attempt.sentenceAttempts.push({
      sentenceOrder,
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

  // Recalculate attempt-level stats
  const completedCount = attempt.sentenceAttempts.filter(
    (s) => s.isCompleted,
  ).length;
  attempt.completedSentences = completedCount;

  const scoredAttempts = attempt.sentenceAttempts.filter(
    (s) => s.attemptCount > 0,
  );
  attempt.totalScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((sum, s) => sum + s.bestScore, 0) /
            scoredAttempts.length,
        )
      : 0;

  // Check overall completion
  if (
    completedCount >= lesson.totalSentences &&
    attempt.status !== "completed"
  ) {
    attempt.status = "completed";
    attempt.completedAt = new Date();
  }

  await attempt.save();

  return {
    grading: {
      score,
      feedback: submission.feedback,
      gradedBy: provider,
    },
    // Return explanation after submit
    explanation: sentence.explanation || null,
    sentenceProgress: {
      sentenceOrder,
      attemptCount: sa.attemptCount,
      bestScore: sa.bestScore,
      isCompleted: sa.isCompleted,
    },
    attemptSummary: {
      status: attempt.status,
      completedSentences: attempt.completedSentences,
      totalSentences: lesson.totalSentences,
      totalScore: attempt.totalScore,
    },
  };
}

/**
 * Get exercise progress
 */
export async function getProgress(userId, lessonId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  const lesson = await WritingLesson.findById(lessonId)
    .select("totalSentences title")
    .lean();

  return {
    lessonId,
    lessonTitle: lesson?.title,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalSentences: lesson?.totalSentences || 0,
    totalScore: attempt.totalScore,
    completedAt: attempt.completedAt,
    sentenceAttempts: attempt.sentenceAttempts.map((sa) => ({
      sentenceOrder: sa.sentenceOrder,
      attemptCount: sa.attemptCount,
      bestScore: sa.bestScore,
      isCompleted: sa.isCompleted,
      lastSubmission:
        sa.submissions.length > 0
          ? sa.submissions[sa.submissions.length - 1]
          : null,
    })),
  };
}

/**
 * Get full submission history for a sentence
 */
export async function getHistory(userId, lessonId) {
  const attempt = await ExerciseAttempt.findOne({ userId, lessonId });
  if (!attempt) throw ApiError.notFound("No attempt found for this lesson");

  return {
    lessonId,
    status: attempt.status,
    completedSentences: attempt.completedSentences,
    totalScore: attempt.totalScore,
    sentenceAttempts: attempt.sentenceAttempts.map((sa) => ({
      sentenceOrder: sa.sentenceOrder,
      attemptCount: sa.attemptCount,
      bestScore: sa.bestScore,
      isCompleted: sa.isCompleted,
      submissions: sa.submissions,
    })),
  };
}
