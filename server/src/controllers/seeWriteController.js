import * as seeWriteService from "@server/services/seeWriteService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { USER_ROLE } from "@server/const/user";

/**
 * GET /api/writing/see-and-write — admin: all, user: filtered
 */
export async function listLessons(req, res, next) {
  try {
    const { level, topic, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);

    const { items, total } = req.user.role === USER_ROLE.ADMIN
      ? await seeWriteService.listLessonsAdmin({ page: p, limit: l })
      : await seeWriteService.listLessons({ level, topic }, { page: p, limit: l });

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
 * GET /api/writing/see-and-write/:id — admin: full (no shuffle), user: limited
 */
export async function getLesson(req, res, next) {
  try {
    const data = req.user.role === USER_ROLE.ADMIN
      ? await seeWriteService.getLessonAdmin(req.params.id)
      : await seeWriteService.getLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/writing/see-and-write/:lessonId/attempt
 */
export async function getAttempt(req, res, next) {
  try {
    const data = await seeWriteService.getAttempt(
      req.user._id,
      req.params.id,
    );
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
    const { selectedKeywords } = req.body;
    if (!Array.isArray(selectedKeywords)) {
      throw ApiError.badRequest("selectedKeywords must be an array");
    }
    const data = await seeWriteService.checkKeywords(
      req.user._id,
      req.params.id,
      selectedKeywords,
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
 * GET /api/writing/see-and-write/:lessonId/progress
 */
export async function getProgress(req, res, next) {
  try {
    const data = await seeWriteService.getProgress(
      req.user._id,
      req.params.id,
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
    validateFields(req.body, ["title", "level", "mediaUrl"]);
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
