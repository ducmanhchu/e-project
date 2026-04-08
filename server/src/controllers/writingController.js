import * as writingService from "@server/services/writingService";

/**
 * POST /admin/writing/reverse-translation/preview
 * Bước 1: split + Gemini dịch + vocab, chưa lưu DB
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
 * POST /admin/writing/reverse-translation
 * Bước 2: lưu lesson draft
 */
export async function createWriting(req, res, next) {
  try {
    const data = await writingService.createWriting(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /admin/writing/reverse-translation/:id/dictionary
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

