import * as slangHangService from "@server/services/slangHangService";
import { validateFields, validateObjectId } from "@server/helpers/validateFields";
import { parseQueryList } from "@server/helpers/writing/listLessonsQuery";
import { parseIdList } from "@server/helpers/parseIdList";

/**
 * POST /api/admin/slang-hang/generate — [ADMIN]
 */
export async function generate(req, res, next) {
  try {
    validateFields(req.body, ["title", "level", "topic"]);
    const data = await slangHangService.generateDialogue({
      title: req.body.title,
      level: req.body.level,
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
    const { level, topic, search, page = 1, limit = 12 } = req.query;
    const result = await slangHangService.listDialogues({
      userId: req.user._id,
      level: parseQueryList(level),
      topic: parseQueryList(topic),
      search,
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
 * DELETE /api/admin/slang-hang/dialogues/:id — [ADMIN]
 */
export async function remove(req, res, next) {
  try {
    validateObjectId(req.params.id, "id");
    await slangHangService.deleteDialogue({ id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/admin/slang-hang/dialogues?ids=a,b,c — [ADMIN] Bulk delete
 */
export async function bulkDelete(req, res, next) {
  try {
    const ids = parseIdList(req.query.ids);
    const { deleted } = await slangHangService.bulkDeleteDialogues(ids);
    res.json({ success: true, deleted });
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
 * POST /api/slang-hang/dialogues/:id/retry
 *
 * Clears the user's progress for this dialogue so they can start over.
 * Idempotent — succeeds whether or not the user has any prior progress.
 */
export async function retry(req, res, next) {
  try {
    validateObjectId(req.params.id, "id");
    await slangHangService.retry({
      userId: req.user._id,
      dialogueId: req.params.id,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/slang-hang/dialogues/:id/submit
 *
 * Records one message attempt (user's reading of one message) into the user's
 * DialogueAttempt for this dialogue. Upserts: creates the parent attempt on
 * first call, replaces the entry with the same messageOrder (latest semantics).
 */
export async function submitMessageAttempt(req, res, next) {
  try {
    validateObjectId(req.params.id, "id");
    validateFields(req.body, ["messageOrder", "targetText", "feedback"]);

    const data = await slangHangService.recordMessageAttempt({
      userId: req.user._id,
      dialogueId: req.params.id,
      messageOrder: req.body.messageOrder,
      targetText: req.body.targetText,
      feedback: req.body.feedback,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
