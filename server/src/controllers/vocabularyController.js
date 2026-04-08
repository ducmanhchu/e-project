import * as vocabularyService from "@server/services/vocabularyService";
import { ApiError } from "@server/helpers/ApiError";

export async function addWord(req, res, next) {
  try {
    const data = await vocabularyService.addWord(req.user._id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/vocabulary?ids=id1,id2  → batch by IDs
 * GET /api/vocabulary?status=&search=&page=&limit=  → user list
 */
export async function listWords(req, res, next) {
  try {
    const { ids, status, search, page = 1, limit = 20 } = req.query;

    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      const data = await vocabularyService.getWordsByIds(idList);
      return res.json({ success: true, data });
    }

    const data = await vocabularyService.listWords(
      req.user._id,
      { status, search },
      { page: Math.max(1, +page), limit: Math.min(Math.max(1, +limit), 50) },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getWordDetail(req, res, next) {
  try {
    const data = await vocabularyService.getWordDetail(
      req.user._id,
      req.params.wordId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) throw ApiError.badRequest("status is required");
    const data = await vocabularyService.updateStatus(
      req.user._id,
      req.params.wordId,
      status,
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
      req.params.wordId,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getStats(req, res, next) {
  try {
    const data = await vocabularyService.getStats(req.user._id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getReviewQuestions(req, res, next) {
  try {
    const { type = "new_words", limit = 5 } = req.query;
    const data = await vocabularyService.getReviewQuestions(
      req.user._id,
      type,
      Math.min(+limit, 20),
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function recordReview(req, res, next) {
  try {
    const { wordIds, correctIds } = req.body;
    if (!Array.isArray(wordIds) || !Array.isArray(correctIds)) {
      throw ApiError.badRequest("wordIds and correctIds must be arrays");
    }
    const data = await vocabularyService.recordReview(
      req.user._id,
      wordIds,
      correctIds,
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
