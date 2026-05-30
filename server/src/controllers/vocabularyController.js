import * as vocabularyService from "@server/services/vocabularyService";

export async function addWord(req, res, next) {
  try {
    const data = await vocabularyService.addWord(req.user._id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/admin/vocabulary?mode=manual|enrich  — [ADMIN] create Vocabulary entry
 *  - mode=manual: body { word, partOfSpeech, definitions[], ipa?, audio? }
 *  - mode=enrich: body { word, partOfSpeech? } — server fetches Vocaxis → AI fallback
 */
export async function createVocabulary(req, res, next) {
  try {
    const data = await vocabularyService.createVocabulary({
      mode: req.query.mode,
      ...req.body,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/admin/vocabulary/:id  — [ADMIN] partial update Vocabulary entry
 */
export async function updateVocabulary(req, res, next) {
  try {
    const data = await vocabularyService.updateVocabulary(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/admin/vocabulary/:id  — [ADMIN] delete Vocabulary entry
 */
export async function deleteVocabulary(req, res, next) {
  try {
    const data = await vocabularyService.deleteVocabulary(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/vocabulary?ids=id1,id2          — batch lookup by global Vocabulary._id
 * GET /api/vocabulary?search=&page=&limit= — list global Vocabulary collection
 * (also mounted under /api/admin/vocabulary)
 */
export async function listDictionary(req, res, next) {
  try {
    const { ids, search, page = 1, limit = 20 } = req.query;

    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      const data = await vocabularyService.getDictionaryByIds(idList);
      return res.json({ success: true, data });
    }

    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), 50);
    const { items, total } = await vocabularyService.listDictionary(
      { search },
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
 * GET /api/vocabulary/:id  — single global Vocabulary doc by _id
 */
export async function getDictionaryById(req, res, next) {
  try {
    const data = await vocabularyService.getDictionaryById(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/me/vocabulary?status=&search=&page=&limit=  — user's vocab list
 */
export async function listMyVocabulary(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const data = await vocabularyService.listMyVocabulary(
      req.user._id,
      { status, search },
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/me/vocabulary/:id  — user's vocab detail by UserVocabulary._id
 */
export async function getMyVocabularyById(req, res, next) {
  try {
    const data = await vocabularyService.getMyVocabularyById(
      req.user._id,
      req.params.id,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function deleteWord(req, res, next) {
  try {
    const data = await vocabularyService.deleteWord(
      req.user._id,
      req.params.id,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
