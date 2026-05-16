import { Deck } from "@server/models/deck/Deck";
import { Card } from "@server/models/deck/Card";
import { ApiError } from "@server/helpers/ApiError";
import { DECK_VISIBILITY } from "@server/const/deck";
import {
  resolveSort,
  buildTextSearch,
  buildMultiFieldSearch,
} from "@server/helpers/listQuery";

const DECK_SORT_FIELDS = new Set(["createdAt", "updatedAt", "name", "cardCount"]);
const CARD_SORT_FIELDS = new Set(["createdAt", "updatedAt"]);
const AUTHOR_FIELDS = "fullName avatarUrl";

async function _findPublicDeck(deckId) {
  const deck = await Deck.findOne({
    _id: deckId,
    visibility: DECK_VISIBILITY.PUBLIC,
  })
    .populate("userId", AUTHOR_FIELDS)
    .lean();
  if (!deck) throw ApiError.notFound("Deck not found or not public");
  return deck;
}

export async function listPublicDecks(filters, pagination) {
  const { search, tag, authorId, sortBy, order, includeEmpty } = filters || {};
  const { page, limit } = pagination;
  const query = {
    visibility: DECK_VISIBILITY.PUBLIC,
    ...buildTextSearch(search, "name"),
    ...(!includeEmpty && { cardCount: { $gt: 0 } }),
    ...(tag && { tags: String(tag).toLowerCase() }),
    ...(authorId && { userId: authorId }),
  };
  const sort = resolveSort(DECK_SORT_FIELDS, sortBy, order);
  const [items, total] = await Promise.all([
    Deck.find(query)
      .populate("userId", AUTHOR_FIELDS)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Deck.countDocuments(query),
  ]);
  return { items, total };
}

export async function getPublicDeckById(deckId) {
  return _findPublicDeck(deckId);
}

export async function listPublicDeckCards(deckId, filters, pagination) {
  await _findPublicDeck(deckId);
  const { tag, search, sortBy, order } = filters || {};
  const { page, limit } = pagination;
  const query = {
    deckId,
    ...buildMultiFieldSearch(search, ["frontContent", "backContent"]),
    ...(tag && { tags: String(tag).toLowerCase() }),
  };
  const sort = resolveSort(CARD_SORT_FIELDS, sortBy, order);
  const [items, total] = await Promise.all([
    Card.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Card.countDocuments(query),
  ]);
  return { items, total };
}

export async function cloneDeck(userId, sourceDeckId) {
  const source = await Deck.findOne({
    _id: sourceDeckId,
    visibility: DECK_VISIBILITY.PUBLIC,
  }).lean();
  if (!source) throw ApiError.notFound("Deck not found or not public");

  const sourceCards = await Card.find({ deckId: sourceDeckId })
    .select("frontContent backContent ipa example audio image tags")
    .lean();

  const newDeck = await Deck.create({
    userId,
    name: source.name,
    ...(source.description && { description: source.description }),
    ...(source.tags?.length && { tags: source.tags }),
    ...(source.image && { image: source.image, imagePublicId: null }),
    visibility: DECK_VISIBILITY.PRIVATE,
    folderId: null,
    cardCount: sourceCards.length,
  });

  if (sourceCards.length > 0) {
    const cardPayloads = sourceCards.map((c) => ({
      deckId: newDeck._id,
      userId,
      frontContent: c.frontContent,
      backContent: c.backContent,
      ...(c.ipa && { ipa: c.ipa }),
      ...(c.example && { example: c.example }),
      ...(c.audio && { audio: c.audio }),
      ...(c.image && { image: c.image, imagePublicId: null }),
      ...(c.tags?.length && { tags: c.tags }),
    }));
    await Card.insertMany(cardPayloads);
  }

  return newDeck.toObject();
}
