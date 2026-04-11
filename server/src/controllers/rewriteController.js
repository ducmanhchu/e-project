import * as rewriteService from "@server/services/rewriteService";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/writing/rewrite
 */
export async function listLessons(req, res, next) {
  try {
    const { level, topic, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await rewriteService.listLessons(
      { level, topic },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/rewrite/:lessonId
 */
export async function getLesson(req, res, next) {
  try {
    const data = await rewriteService.getLesson(req.params.lessonId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/rewrite/:lessonId/attempt
 */
export async function getAttempt(req, res, next) {
  try {
    const data = await rewriteService.getAttempt(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/rewrite/:lessonId/submit
 */
export async function submitAnswer(req, res, next) {
  try {
    const { sentenceOrder, userAnswer } = req.body;
    if (sentenceOrder == null) {
      throw ApiError.badRequest("sentenceOrder is required");
    }
    if (!userAnswer?.trim()) {
      throw ApiError.badRequest("userAnswer is required");
    }

    const data = await rewriteService.submitAnswer(
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
 * GET /api/writing/rewrite/:lessonId/progress
 */
export async function getProgress(req, res, next) {
  try {
    const data = await rewriteService.getProgress(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/rewrite/:lessonId/history
 */
export async function getHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await rewriteService.getHistory(
      req.user._id,
      req.params.lessonId,
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
