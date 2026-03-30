import * as exerciseService from "@server/services/exerciseService";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/writings
 */
export async function listLessons(req, res, next) {
  try {
    const { level, contentType, topic, status, page = 1, limit = 12 } = req.query;
    const data = await exerciseService.listLessons(
      req.user._id,
      { level, contentType, topic, status },
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writings/:lessonId/exercise
 */
export async function getExercise(req, res, next) {
  try {
    const data = await exerciseService.getExercise(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writings/:lessonId/exercise/submit
 */
export async function submitAnswer(req, res, next) {
  try {
    const { sentenceOrder, userAnswer } = req.body;

    if (!sentenceOrder || !userAnswer?.trim()) {
      throw ApiError.badRequest("sentenceOrder and userAnswer are required");
    }

    const data = await exerciseService.submitAnswer(
      req.user._id,
      req.params.lessonId,
      +sentenceOrder,
      userAnswer.trim(),
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writings/:lessonId/exercise/progress
 */
export async function getProgress(req, res, next) {
  try {
    const data = await exerciseService.getProgress(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writings/:lessonId/exercise/history
 */
export async function getHistory(req, res, next) {
  try {
    const data = await exerciseService.getHistory(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
