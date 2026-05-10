import * as rewriteService from "@server/services/rewriteService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { parseQueryList } from "@server/helpers/writing/listLessonsQuery";

/**
 * GET /api/writing/rewrite — Public list (optional auth, user-only shape)
 */
export async function listLessons(req, res, next) {
  try {
    const { level, topic, search, sortBy, order, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await rewriteService.listLessons(
      {
        level: parseQueryList(level),
        topic: parseQueryList(topic),
        search,
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
 * GET /api/writing/rewrite/:id — User detail (merged attempt)
 */
export async function getLesson(req, res, next) {
  try {
    const data = await rewriteService.getLesson(req.params.id, req.user._id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/rewrite — [ADMIN] List full data
 */
export async function adminListLessons(req, res, next) {
  try {
    const { level, topic, search, sortBy, order, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await rewriteService.adminListLessons(
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
 * GET /api/admin/writing/rewrite/:id — [ADMIN] Full data with referenceAnswer
 */
export async function adminGetLesson(req, res, next) {
  try {
    const data = await rewriteService.adminGetLesson(req.params.id);
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
      req.params.id,
      +sentenceOrder,
      userAnswer.trim(),
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}


/**
 * POST /api/writing/rewrite — [ADMIN]
 */
export async function createLesson(req, res, next) {
  try {
    validateFields(req.body, ["title", "level", "sentences"]);
    const data = await rewriteService.createLesson(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/writing/rewrite/:id — [ADMIN]
 */
export async function updateLesson(req, res, next) {
  try {
    const data = await rewriteService.updateLesson(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/writing/rewrite/:id — [ADMIN] Delete
 */
export async function deleteLesson(req, res, next) {
  try {
    const data = await rewriteService.deleteLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
