import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";

/**
 * Find or create an attempt for a user + lesson.
 */
export async function findOrCreateAttempt(userId, lessonId, lessonType) {
  let attempt = await Attempt.findOne({ userId, lessonId });
  if (!attempt) {
    attempt = await Attempt.create({
      userId,
      lessonId,
      lessonType,
      sentenceProgress: [],
    });
  }
  return attempt;
}

/**
 * Submit an answer: create Submission + update Attempt progress.
 */
export async function submitAndUpdateProgress(attempt, {
  sentenceOrder,
  userAnswer,
  score,
  gradedBy,
  feedback,
  isCompleted: isNowCompleted,
  totalSentences,
  keepOnlyLast = false,
}) {
  const submissionData = { attemptId: attempt._id, sentenceOrder, userAnswer, score, gradedBy, feedback };
  const submission = keepOnlyLast
    ? await Submission.findOneAndUpdate(
        { attemptId: attempt._id, sentenceOrder },
        submissionData,
        { upsert: true, new: true },
      )
    : await Submission.create(submissionData);

  let progress = attempt.sentenceProgress.find(
    (p) => p.sentenceOrder === sentenceOrder,
  );
  if (!progress) {
    attempt.sentenceProgress.push({
      sentenceOrder,
      bestScore: 0,
      isCompleted: false,
    });
    progress = attempt.sentenceProgress[attempt.sentenceProgress.length - 1];
  }

  if (score > progress.bestScore) progress.bestScore = score;
  if (isNowCompleted) progress.isCompleted = true;

  const completedCount = attempt.sentenceProgress.filter((p) => p.isCompleted).length;
  attempt.completedSentences = completedCount;

  const scoredProgress = attempt.sentenceProgress.filter((p) => p.bestScore > 0);
  attempt.bestScore =
    scoredProgress.length > 0
      ? Math.round(
          scoredProgress.reduce((sum, p) => sum + p.bestScore, 0) / scoredProgress.length,
        )
      : 0;

  if (completedCount >= totalSentences && attempt.status !== "completed") {
    attempt.status = "completed";
    attempt.completedAt = new Date();
  } else if (attempt.status === "not_started") {
    attempt.status = "in_progress";
  }

  await attempt.save();

  return { submission, progress };
}

/**
 * Reset attempt for retry — clear progress, keep history.
 */
export async function resetAttempt(attempt) {
  attempt.status = "in_progress";
  attempt.completedSentences = 0;
  attempt.bestScore = 0;
  attempt.completedAt = null;
  attempt.sentenceProgress = [];
  attempt.keywordQuiz = undefined;
  await attempt.save();
  return attempt;
}

/**
 * Get last submission for ALL sentences in 1 query (fixes N+1).
 * Returns Map<sentenceOrder, submission>
 */
export async function getLastSubmissions(attemptId) {
  const results = await Submission.aggregate([
    { $match: { attemptId } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$sentenceOrder",
        doc: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },
    {
      $project: {
        _id: 0,
        sentenceOrder: 1,
        userAnswer: 1,
        score: 1,
        gradedBy: 1,
        feedback: 1,
        createdAt: 1,
      },
    },
  ]);

  const map = new Map();
  for (const sub of results) {
    const order = sub.sentenceOrder;
    delete sub.sentenceOrder;
    map.set(order, sub);
  }
  return map;
}

/**
 * Get last submission for a single sentence.
 */
export async function getLastSubmission(attemptId, sentenceOrder) {
  return Submission.findOne({ attemptId, sentenceOrder })
    .select("userAnswer score gradedBy feedback createdAt -_id")
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get submissions for an attempt (paginated).
 */
export async function getSubmissions(attemptId, { sentenceOrder, limit = 20, page = 1 } = {}) {
  const query = { attemptId };
  if (sentenceOrder != null) query.sentenceOrder = sentenceOrder;

  const [docs, total] = await Promise.all([
    Submission.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Submission.countDocuments(query),
  ]);

  return { docs, total, page, limit };
}
