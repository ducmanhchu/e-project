import * as exerciseService from "@server/services/exerciseService";
import * as writingService from "@server/services/writingService";
import { ApiError } from "@server/helpers/ApiError";

/**
 * GET /api/writing/reverse-translation
 */
export async function listLessons(req, res, next) {
  try {
    const { level, contentType, topic, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await exerciseService.listLessons(
      { level, contentType, topic },
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
 * GET /api/writing/reverse-translation/:lessonId
 */
export async function getLesson(req, res, next) {
  try {
    const data = await exerciseService.getLesson(req.params.id, req.user._id);
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
 * POST /api/writing/reverse-translation/preview — [ADMIN]
 */
export async function previewWriting(req, res, next) {
  try {
    const data = await writingService.previewWriting(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/reverse-translation — [ADMIN] Create
 */
export async function createLesson(req, res, next) {
  try {
    const data = await writingService.createWriting(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/writing/reverse-translation/:id/dictionary — [ADMIN]
 */
export async function saveDictionary(req, res, next) {
  try {
    const data = await writingService.saveDictionary(
      req.params.id,
      req.body,
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/writing/reverse-translation/:id — [ADMIN] Update
 */
export async function updateLesson(req, res, next) {
  try {
    const data = await exerciseService.updateLesson(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/writing/reverse-translation/:id — [ADMIN] Delete
 */
export async function deleteLesson(req, res, next) {
  try {
    const data = await exerciseService.deleteLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/writing/reverse-translation — Admin list
 */
export async function adminListLessons(req, res, next) {
  try {
    const { level, contentType, topic, page = 1, limit = 12 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await exerciseService.adminListLessons(
      { level, contentType, topic },
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
 * GET /api/admin/writing/reverse-translation/:id — Admin full detail
 */
export async function adminGetLesson(req, res, next) {
  try {
    const data = await exerciseService.adminGetLesson(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

