import * as seeWriteService from "@server/services/seeWriteService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { parseQueryList } from "@server/helpers/writing/listLessonsQuery";
import { parseIdList } from "@server/helpers/parseIdList";

/**
 * GET /api/writing/see-and-write — Public list (optional auth, user-only shape)
 */
export async function listLessons(req, res, next) {
  try {
    const { level, topic, search, status, sortBy, order, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await seeWriteService.listLessons(
      {
        level: parseQueryList(level),
        topic: parseQueryList(topic),
        search,
        status: parseQueryList(status),
        sortBy,
        order,
      },
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
 * GET /api/writing/see-and-write/:id — User detail (merged attempt)
 */
export async function getLesson(req, res, next) {
  try {
    const data = await seeWriteService.getLesson(req.params.id, req.user._id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/see-and-write — [ADMIN] List full data
 */
export async function adminListLessons(req, res, next) {
  try {
    const { level, topic, search, sortBy, order, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await seeWriteService.adminListLessons(
      {
        level: parseQueryList(level),
        topic: parseQueryList(topic),
        search,
        sortBy,
        order,
      },
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
 * GET /api/admin/writing/see-and-write/:id — [ADMIN] Full data, no shuffle
 */
export async function adminGetLesson(req, res, next) {
  try {
    const data = await seeWriteService.adminGetLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/see-and-write/:lessonId/check-keywords
 */
export async function checkKeywords(req, res, next) {
  try {
    const { selectedKeywordIds } = req.body;
    if (!Array.isArray(selectedKeywordIds)) {
      throw ApiError.badRequest("selectedKeywordIds must be an array");
    }
    const data = await seeWriteService.checkKeywords(
      req.user._id,
      req.params.id,
      selectedKeywordIds,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/see-and-write/:lessonId/submit
 */
export async function submitAnswer(req, res, next) {
  try {
    const { userAnswer } = req.body;
    if (!userAnswer?.trim()) {
      throw ApiError.badRequest("userAnswer is required");
    }

    const data = await seeWriteService.submitAnswer(
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
 * GET /api/writing/see-and-write/:lessonId/history
 */
export async function getHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await seeWriteService.getHistory(
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
 * POST /api/writing/see-and-write — [ADMIN]
 */
export async function createLesson(req, res, next) {
  try {
    validateFields(req.body, ["title", "level", "image"]);
    const data = await seeWriteService.createLesson(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/writing/see-and-write/:id — [ADMIN]
 */
export async function updateLesson(req, res, next) {
  try {
    const data = await seeWriteService.updateLesson(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/writing/see-and-write/:id — [ADMIN] Delete
 */
export async function deleteLesson(req, res, next) {
  try {
    const data = await seeWriteService.deleteLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/admin/writing/see-and-write?ids=a,b,c — [ADMIN] Bulk delete
 */
export async function bulkDelete(req, res, next) {
  try {
    const ids = parseIdList(req.query.ids);
    const { deleted } = await seeWriteService.bulkDeleteLessons(ids);
    res.json({ success: true, deleted });
  } catch (e) {
    next(e);
  }
}
