import * as communityService from "@server/services/communityService";
import { ApiError } from "@server/helpers/ApiError";
import { validateObjectId } from "@server/helpers/validateFields";
import { DECK_LIMITS } from "@server/const/deck";

export async function listPublicDecks(req, res, next) {
  try {
    const {
      search,
      tag,
      authorId,
      sortBy,
      order,
      includeEmpty,
      page = 1,
      limit = 20,
    } = req.query;
    if (authorId) validateObjectId(authorId, "authorId");
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), DECK_LIMITS.DECK_LIST_PAGE_SIZE_MAX);
    const { items, total } = await communityService.listPublicDecks(
      {
        search,
        tag,
        authorId,
        sortBy,
        order,
        includeEmpty: includeEmpty === "true",
      },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) { next(e); }
}

export async function getPublicDeck(req, res, next) {
  try {
    validateObjectId(req.params.deckId, "deckId");
    const data = await communityService.getPublicDeckById(req.params.deckId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listPublicDeckCards(req, res, next) {
  try {
    validateObjectId(req.params.deckId, "deckId");
    const { search, tag, sortBy, order, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), DECK_LIMITS.CARD_LIST_PAGE_SIZE_MAX);
    const { items, total } = await communityService.listPublicDeckCards(
      req.params.deckId,
      { search, tag, sortBy, order },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) { next(e); }
}

export async function cloneDeck(req, res, next) {
  try {
    const { sourceDeckId } = req.body || {};
    if (!sourceDeckId) throw ApiError.badRequest("sourceDeckId is required");
    validateObjectId(sourceDeckId, "sourceDeckId");
    const data = await communityService.cloneDeck(req.user._id, sourceDeckId);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}
