import { Attempt } from "@server/models/attempt/Attempt";
import { resetAttempt } from "@server/helpers/attemptHelper";
import { ApiError } from "@server/helpers/ApiError";
import * as reverseTranslationService from "@server/services/reverseTranslationService";
import * as seeWriteService from "@server/services/seeWriteService";
import * as rewriteService from "@server/services/rewriteService";
import * as examService from "@server/services/examService";

const LESSON_GETTERS = {
  ReverseTranslation: reverseTranslationService.getLesson,
  SeeWrite: seeWriteService.getLesson,
  Rewrite: rewriteService.getLesson,
  Exam: examService.getExam,
};

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

/**
 * PUT /api/attempts/:id — Update attempt (retry, etc.)
 */
export async function updateAttempt(req, res, next) {
  try {
    const { action } = req.body;
    if (!action) throw ApiError.badRequest("action is required");

    const attempt = await Attempt.findOne({
      userId: req.user._id,
      lessonId: req.params.id,
    });
    if (!attempt) throw ApiError.notFound("No attempt found");

    if (action === "retry") {
      await resetAttempt(attempt);
      const getter = LESSON_GETTERS[attempt.lessonType];
      const data = await getter(attempt.lessonId, req.user._id);
      return res.json({ success: true, data });
    }

    throw ApiError.badRequest(`Unknown action: ${action}`);
  } catch (e) {
    next(e);
  }
}
