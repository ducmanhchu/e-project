import * as examAdminService from "@server/services/examAdminService";
import { validateFields } from "@server/helpers/validateFields";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/admin/writing/exam
 */
export async function listExams(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const data = await examAdminService.listExams({ page: p, limit: l });
    res.json({
      success: true,
      data: data.items,
      pagination: { page: p, limit: l, total: data.total, totalPages: Math.ceil(data.total / l) },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/exam/:id
 */
export async function getExam(req, res, next) {
  try {
    const data = await examAdminService.getExamAdmin(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/admin/writing/exam
 */
export async function createExam(req, res, next) {
  try {
    validateFields(req.body, ["title", "examType", "examPrompt"]);

    if (req.body.examType === "ielts_task1" && !req.body.imageUrl?.trim()) {
      throw ApiError.badRequest("imageUrl is required for IELTS Task 1");
    }

    const data = await examAdminService.createExam(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
