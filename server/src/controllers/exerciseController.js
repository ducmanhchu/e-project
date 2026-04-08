import * as exerciseService from "@server/services/exerciseService";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/writing/reverse-translation
 */
export async function listLessons(req, res, next) {
  try {
    const { level, contentType, topic, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const data = await exerciseService.listLessons(
      { level, contentType, topic },
      { page: p, limit: l },
    );
    res.json({ success: true, data, pagination: { page: p, limit: l } });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/attempts?lessonIds=id1,id2
 */
export async function listAttempts(req, res, next) {
  try {
    const { lessonIds } = req.query;
    const ids = lessonIds ? lessonIds.split(",").filter(Boolean) : null;
    const data = await exerciseService.listAttempts(req.user._id, ids);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/reverse-translation/:lessonId
 */
export async function getLesson(req, res, next) {
  try {
    const data = await exerciseService.getLesson(req.params.lessonId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/attempts/:lessonId
 */
export async function getAttempt(req, res, next) {
  try {
    const data = await exerciseService.getAttempt(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/attempts/:lessonId/submit
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
 * GET /api/attempts/:lessonId/progress
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
 * GET /api/attempts/:lessonId/history
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

