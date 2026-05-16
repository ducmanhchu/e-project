import * as deckService from "@server/services/deckService";
import { ApiError } from "@server/helpers/ApiError";
import { validateObjectId } from "@server/helpers/validateFields";
import { DECK_LIMITS } from "@server/const/deck";

export async function createDeck(req, res, next) {
  try {
    const data = await deckService.createDeck(req.user._id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listMyDecks(req, res, next) {
  try {
    const { search, tag, folderId, sortBy, order, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), DECK_LIMITS.DECK_LIST_PAGE_SIZE_MAX);
    const folderFilter =
      folderId === "null" ? null : folderId || undefined;
    const { items, total } = await deckService.listMyDecks(
      req.user._id,
      { search, tag, folderId: folderFilter, sortBy, order },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) { next(e); }
}

export async function getMyDeckById(req, res, next) {
  try {
    validateObjectId(req.params.deckId, "deckId");
    const data = await deckService.getMyDeckById(req.user._id, req.params.deckId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateDeck(req, res, next) {
  try {
    validateObjectId(req.params.deckId, "deckId");
    const data = await deckService.updateDeck(req.user._id, req.params.deckId, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteDeck(req, res, next) {
  try {
    validateObjectId(req.params.deckId, "deckId");
    const data = await deckService.deleteDeck(req.user._id, req.params.deckId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listCards(req, res, next) {
  try {
    const { deckId, tag, search, sortBy, order, page = 1, limit = 20 } = req.query;
    if (!deckId) throw ApiError.badRequest("deckId query is required");
    validateObjectId(deckId, "deckId");
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), DECK_LIMITS.CARD_LIST_PAGE_SIZE_MAX);
    const { items, total } = await deckService.listCards(
      req.user._id,
      deckId,
      { tag, search, sortBy, order },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) { next(e); }
}

export async function addCardManual(req, res, next) {
  try {
    const { deckId } = req.body || {};
    if (!deckId) throw ApiError.badRequest("deckId is required");
    validateObjectId(deckId, "deckId");
    const data = await deckService.addCardManual(req.user._id, deckId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateCard(req, res, next) {
  try {
    validateObjectId(req.params.cardId, "cardId");
    const data = await deckService.updateCard(
      req.user._id, req.params.cardId, req.body,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteCard(req, res, next) {
  try {
    validateObjectId(req.params.cardId, "cardId");
    const data = await deckService.deleteCard(req.user._id, req.params.cardId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function addCardsFromVocab(req, res, next) {
  try {
    const { deckId, userVocabularyIds } = req.body || {};
    if (!deckId) throw ApiError.badRequest("deckId is required");
    validateObjectId(deckId, "deckId");
    const data = await deckService.addCardsFromVocab(
      req.user._id, deckId, userVocabularyIds,
    );
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function getStudyCards(req, res, next) {
  try {
    const { deckId } = req.query;
    if (!deckId) throw ApiError.badRequest("deckId query is required");
    validateObjectId(deckId, "deckId");
    const data = await deckService.getShuffledStudyCards(req.user._id, deckId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function rateCard(req, res, next) {
  try {
    validateObjectId(req.params.cardId, "cardId");
    const data = await deckService.rateCard(
      req.user._id, req.params.cardId, req.body,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
