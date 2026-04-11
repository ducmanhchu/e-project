import * as examService from "@server/services/examService";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/writing/exam
 */
export async function listExams(req, res, next) {
  try {
    const { level, topic, examType, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await examService.listExams(
      { level, topic, examType },
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
 * GET /api/writing/exam/:examId
 */
export async function getExam(req, res, next) {
  try {
    const data = await examService.getExam(req.params.examId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/exam/:examId/attempt
 */
export async function getAttempt(req, res, next) {
  try {
    const data = await examService.getAttempt(req.user._id, req.params.examId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/exam/:examId/submit
 */
export async function submitAnswer(req, res, next) {
  try {
    const { userAnswer } = req.body;
    if (!userAnswer?.trim()) {
      throw ApiError.badRequest("userAnswer is required");
    }

    const data = await examService.submitAnswer(
      req.user._id,
      req.params.examId,
      userAnswer.trim(),
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/exam/:examId/progress
 */
export async function getProgress(req, res, next) {
  try {
    const data = await examService.getProgress(req.user._id, req.params.examId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/exam/:examId/history
 */
export async function getHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await examService.getHistory(
      req.user._id,
      req.params.examId,
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
