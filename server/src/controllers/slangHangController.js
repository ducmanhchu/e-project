import * as slangHangService from "@server/services/slangHangService";
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
      mode: req.body.mode,
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
 * GET /api/slang-hang/azure-token
 */
export async function azureToken(req, res, next) {
  try {
    const data = await slangHangService.getAzureSpeechToken();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/slang-hang/dialogue-attempts
 *
 * Records one utterance (user's reading of one message) into the user's
 * DialogueAttempt for this dialogue. Upserts: creates attempt if first
 * utterance, replaces utterance with same messageOrder (latest semantics).
 */
export async function recordUtterance(req, res, next) {
  try {
    validateFields(req.body, [
      "dialogueId",
      "messageOrder",
      "targetText",
      "scores",
    ]);
    validateObjectId(req.body.dialogueId, "dialogueId");

    const data = await slangHangService.recordUtterance({
      userId: req.user._id,
      dialogueId: req.body.dialogueId,
      messageOrder: req.body.messageOrder,
      targetText: req.body.targetText,
      scores: req.body.scores,
      words: req.body.words,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
