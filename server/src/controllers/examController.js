import * as examService from "@server/services/examService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { USER_ROLE } from "@server/const/user";

/**
 * GET /api/writing/exam — admin: all, user: filtered
 */
export async function listExams(req, res, next) {
  try {
    const { level, topic, examType, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);

    const { items, total } = req.user.role === USER_ROLE.ADMIN
      ? await examService.listExamsAdmin({ page: p, limit: l })
      : await examService.listExams({ level, topic, examType }, { page: p, limit: l });

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
 * GET /api/writing/exam/:id — admin: full, user: limited
 */
export async function getExam(req, res, next) {
  try {
    const data = req.user.role === USER_ROLE.ADMIN
      ? await examService.getExamAdmin(req.params.id)
      : await examService.getExam(req.params.id);
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
    const data = await examService.getAttempt(req.user._id, req.params.id);
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
      req.params.id,
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
    const data = await examService.getProgress(req.user._id, req.params.id);
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
      req.params.id,
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/exam — [ADMIN]
 */
export async function createExam(req, res, next) {
  try {
    validateFields(req.body, ["title", "examType", "examPrompt"]);

    if (req.body.examType === "ielts_task1" && !req.body.imageUrl?.trim()) {
      throw ApiError.badRequest("imageUrl is required for IELTS Task 1");
    }

    const data = await examService.createExam(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/writing/exam/:id — [ADMIN] Update
 */
export async function updateExam(req, res, next) {
  try {
    const data = await examService.updateExam(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/writing/exam/:id — [ADMIN] Delete
 */
export async function deleteExam(req, res, next) {
  try {
    const data = await examService.deleteExam(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
