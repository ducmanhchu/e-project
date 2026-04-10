import * as seeWriteAdminService from "@server/services/seeWriteAdminService";
import { validateFields } from "@server/helpers/validateFields";

/**
 * GET /api/admin/writing/see-and-write
 */
export async function listLessons(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const data = await seeWriteAdminService.listLessons({ page: p, limit: l });
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
 * POST /api/admin/writing/see-and-write
 */
export async function createLesson(req, res, next) {
  try {
    validateFields(req.body, ["title", "level", "mediaUrl"]);
    const data = await seeWriteAdminService.createLesson(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/see-and-write/:id
 */
export async function getLesson(req, res, next) {
  try {
    const data = await seeWriteAdminService.getLessonAdmin(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/admin/writing/see-and-write/:id
 */
export async function updateLesson(req, res, next) {
  try {
    const data = await seeWriteAdminService.updateLesson(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
