import * as slangHangService from "@server/services/slangHangService";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields, validateObjectId } from "@server/helpers/validateFields";

/**
 * POST /api/slang-hang/generate
 */
export async function generate(req, res, next) {
  try {
    validateFields(req.body, ["topic"]);
    const data = await slangHangService.generateDialogue({
      userId: req.user._id,
      topic: req.body.topic,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/slang-hang/dialogues
 */
export async function list(req, res, next) {
  try {
    const { page = 1, limit = 12 } = req.query;
    const result = await slangHangService.listDialogues({
      userId: req.user._id,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/slang-hang/dialogues/:id
 */
export async function getOne(req, res, next) {
  try {
    validateObjectId(req.params.id, "id");
    const data = await slangHangService.getDialogue({
      userId: req.user._id,
      id: req.params.id,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/slang-hang/dialogues/:id
 */
export async function remove(req, res, next) {
  try {
    validateObjectId(req.params.id, "id");
    await slangHangService.deleteDialogue({
      userId: req.user._id,
      id: req.params.id,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/slang-hang/grade-pronunciation
 * Multipart: audio file + targetText + slangContext
 */
export async function grade(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest("Audio file required");
    validateFields(req.body, ["targetText"]);

    const data = await slangHangService.gradePronunciation({
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      targetText: req.body.targetText,
      slangContext: req.body.slangContext || "",
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
