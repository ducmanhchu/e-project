import { Attempt } from "@server/models/attempt/Attempt";

/**
 * GET /api/attempts?lessonIds=id1,id2
 * Batch query attempts — dùng chung cho tất cả modules (RT, SW, RW, Exam)
 */
export async function listAttempts(req, res, next) {
  try {
    const { lessonIds } = req.query;
    const query = { userId: req.user._id };

    if (lessonIds) {
      const ids = lessonIds.split(",").filter(Boolean);
      if (ids.length > 0) query.lessonId = { $in: ids };
    }

    const attempts = await Attempt.find(query)
      .select("lessonId status completedSentences bestScore")
      .lean();

    const data = attempts.map((a) => ({
      lessonId: a.lessonId,
      status: a.status,
      completedSentences: a.completedSentences,
      bestScore: a.bestScore,
    }));

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
