import * as writingService from "@server/services/writingService";

/**
 * POST /admin/writings/preview
 * Bước 1: split + Gemini dịch + vocab, chưa lưu DB
 */
export async function previewWriting(req, res, next) {
  try {
    const data = await writingService.previewWriting(req.body.paragraph);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /admin/writings
 * Bước 2: lưu lesson draft
 */
export async function createWriting(req, res, next) {
  try {
    const data = await writingService.createWriting(req.body, req.user._id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /admin/writings/:id/dictionary
 * Bước 3: lưu hint pool
 */
export async function saveDictionary(req, res, next) {
  try {
    const data = await writingService.saveDictionary(
      req.params.id,
      req.body.entries,
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /admin/writings/:id/publish
 * Bước 4: isPublished = true
 */
export async function publishWriting(req, res, next) {
  try {
    const data = await writingService.publishWriting(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
