import * as examService from "@server/services/examService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields, validateObjectId } from "@server/helpers/validateFields";

/**
 * GET /api/writing/exam — Public list (optional auth, user-only shape)
 */
export async function listExams(req, res, next) {
  try {
    const { level, topic, examType, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await examService.listExams(
      { level, topic, examType },
      { page: p, limit: l },
      req.user?._id,
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
 * GET /api/writing/exam/:id — User detail (merged attempt)
 */
export async function getExam(req, res, next) {
  try {
    validateObjectId(req.params.id);
    const data = await examService.getExam(req.params.id, req.user._id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/exam — [ADMIN] List full data
 */
export async function adminListExams(req, res, next) {
  try {
    const { page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await examService.listExamsAdmin({ page: p, limit: l });
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
 * GET /api/admin/writing/exam/:id — [ADMIN] Full data with examPrompt + imageUrl
 */
export async function adminGetExam(req, res, next) {
  try {
    validateObjectId(req.params.id);
    const data = await examService.getExamAdmin(req.params.id);
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
    validateObjectId(req.params.id);
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
    validateObjectId(req.params.id);
    const data = await examService.deleteExam(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
