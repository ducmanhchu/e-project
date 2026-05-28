import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";

const ATTEMPT_STATUSES = new Set(["in_progress", "completed"]);

/**
 * Build a Mongo query fragment that filters Writing lessons by user attempt status.
 *
 * Returns one of:
 *   - null  → no filter (caller spreads as no-op)
 *   - { _id: { $in: [] } }       → force empty result
 *   - { _id: { $in:  [...] } }    → only lessons with attempts in matched statuses
 *   - { _id: { $nin: [...] } }    → lessons NOT attempted by user (= "not_started")
 *   - { $or: [{...}, {...}] }    → mixed (matched attempts ∪ not_started)
 *
 * Guest mode (no userId): all lessons are implicitly "not_started", so
 *   - statuses includes "not_started" → null (return all)
 *   - otherwise → empty result
 */
export async function buildStatusFilter({ userId, lessonType, statuses }) {
  if (!Array.isArray(statuses) || statuses.length === 0) return null;

  const matchedAttemptStatuses = statuses.filter((s) =>
    ATTEMPT_STATUSES.has(s),
  );
  const includesNotStarted = statuses.includes("not_started");

  if (matchedAttemptStatuses.length === 0 && !includesNotStarted) {
    return null;
  }

  if (!userId) {
    return includesNotStarted ? null : { _id: { $in: [] } };
  }

  const attempts = await Attempt.find({ userId, lessonType })
    .select("lessonId status")
    .lean();
  // Attempts with status="not_started" (e.g., after retry/reset) are
  // semantically equivalent to no attempt — exclude from "started" set.
  const startedIds = attempts
    .filter((a) => a.status !== "not_started")
    .map((a) => a.lessonId);
  const matchedIds = matchedAttemptStatuses.length
    ? attempts
        .filter((a) => matchedAttemptStatuses.includes(a.status))
        .map((a) => a.lessonId)
    : [];

  if (matchedAttemptStatuses.length > 0 && !includesNotStarted) {
    return { _id: { $in: matchedIds } };
  }
  if (matchedAttemptStatuses.length === 0 && includesNotStarted) {
    return startedIds.length ? { _id: { $nin: startedIds } } : null;
  }
  return {
    $or: [{ _id: { $in: matchedIds } }, { _id: { $nin: startedIds } }],
  };
}

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
  const submissionData = {
    attemptId: attempt._id,
    userId: attempt.userId,
    sentenceOrder,
    userAnswer,
    score,
    gradedBy,
    feedback,
  };
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
  attempt.status = "not_started";
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
