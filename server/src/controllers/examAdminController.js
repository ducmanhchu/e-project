import * as examAdminService from "@server/services/examAdminService";
import { validateFields } from "@server/helpers/validateFields";
import { ApiError } from "@server/helpers/ApiError";

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
