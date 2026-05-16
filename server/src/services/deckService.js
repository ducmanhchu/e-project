import { Deck } from "@server/models/deck/Deck";
import { Card } from "@server/models/deck/Card";
import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { ApiError } from "@server/helpers/ApiError";
import { sanitizeContent } from "@server/helpers/sanitizeContent";
import {
  normalizeImageFields,
  destroyCloudinaryImage,
} from "@server/helpers/imageFields";
import { DECK_LIMITS, CARD_STUDY_MODE } from "@server/const/deck";
import * as vocabularyService from "@server/services/vocabularyService";
import { assertFolderBelongsToUser } from "@server/services/folderService";
import {
  resolveSort,
  buildTextSearch,
  buildMultiFieldSearch,
} from "@server/helpers/listQuery";

const DECK_SORT_FIELDS = new Set(["createdAt", "updatedAt", "name"]);
const CARD_SORT_FIELDS = new Set(["createdAt", "updatedAt"]);

async function _assertDeckOwnership(userId, deckId) {
  const deck = await Deck.findOne({ _id: deckId, userId }).lean();
  if (!deck) throw ApiError.notFound("Deck not found");
  return deck;
}

export async function createDeck(userId, payload) {
  const { name, description, visibility, tags, image, imagePublicId, folderId } =
    payload || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    throw ApiError.badRequest("name is required");
  }
  if (folderId !== undefined && folderId !== null) {
    await assertFolderBelongsToUser(userId, folderId);
  }
  return Deck.create({
    userId,
    name: name.trim(),
    ...(description !== undefined && { description }),
    ...(visibility !== undefined && { visibility }),
    ...(tags !== undefined && { tags }),
    ...(folderId !== undefined && { folderId }),
    ...normalizeImageFields(image, imagePublicId),
  });
}

export async function getMyDeckById(userId, deckId) {
  return _assertDeckOwnership(userId, deckId);
}

export async function updateDeck(userId, deckId, payload) {
  const existing = await _assertDeckOwnership(userId, deckId);
  const allowed = ["name", "description", "visibility", "tags"];
  const update = {};
  for (const k of allowed) {
    if (payload?.[k] !== undefined) update[k] = payload[k];
  }
  if (payload?.folderId !== undefined) {
    if (payload.folderId !== null) {
      await assertFolderBelongsToUser(userId, payload.folderId);
    }
    update.folderId = payload.folderId;
  }
  const imgFields = normalizeImageFields(payload?.image, payload?.imagePublicId);
  Object.assign(update, imgFields);

  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const oldPublicIdToDestroy =
    "image" in imgFields &&
    existing.imagePublicId &&
    existing.imagePublicId !== imgFields.imagePublicId
      ? existing.imagePublicId
      : null;

  const updated = await Deck.findOneAndUpdate(
    { _id: deckId, userId },
    update,
    { new: true, runValidators: true },
  ).lean();

  if (oldPublicIdToDestroy) await destroyCloudinaryImage(oldPublicIdToDestroy);
  return updated;
}

export async function deleteDeck(userId, deckId) {
  const deck = await _assertDeckOwnership(userId, deckId);
  const cards = await Card.find({ deckId }).lean();
  const publicIds = [
    ...cards.filter((c) => c.imagePublicId).map((c) => c.imagePublicId),
    ...(deck.imagePublicId ? [deck.imagePublicId] : []),
  ];
  await Promise.allSettled(publicIds.map(destroyCloudinaryImage));
  await Card.deleteMany({ deckId });
  await Deck.findOneAndDelete({ _id: deckId, userId });
  return { deleted: true };
}

export async function listMyDecks(userId, filters, pagination) {
  const { search, tag, folderId, sortBy, order } = filters || {};
  const { page, limit } = pagination;
  const query = { userId, ...buildTextSearch(search, "name") };
  if (tag) query.tags = String(tag).toLowerCase();
  if (folderId === null) query.folderId = null;
  else if (folderId) query.folderId = folderId;
  const sort = resolveSort(DECK_SORT_FIELDS, sortBy, order);
  const [items, total] = await Promise.all([
    Deck.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Deck.countDocuments(query),
  ]);
  return { items, total };
}

export async function addCardManual(userId, deckId, payload) {
  await _assertDeckOwnership(userId, deckId);
  const {
    frontContent, backContent, ipa, example, audio, image, imagePublicId, tags,
  } = payload || {};
  if (frontContent == null || frontContent === "") {
    throw ApiError.badRequest("frontContent is required");
  }
  if (backContent == null || backContent === "") {
    throw ApiError.badRequest("backContent is required");
  }
  const doc = {
    deckId,
    userId,
    frontContent: sanitizeContent(frontContent),
    backContent: sanitizeContent(backContent),
    ...(ipa !== undefined && { ipa }),
    ...(example !== undefined && { example }),
    ...(audio !== undefined && { audio }),
    ...normalizeImageFields(image, imagePublicId),
    ...(tags !== undefined && { tags }),
  };
  const card = await Card.create(doc);
  await Deck.updateOne({ _id: deckId }, { $inc: { cardCount: 1 } });
  return card;
}

export async function updateCard(userId, cardId, payload) {
  const existing = await Card.findOne({ _id: cardId, userId }).lean();
  if (!existing) throw ApiError.notFound("Card not found");

  const allowed = ["frontContent", "backContent", "ipa", "example", "audio", "tags"];
  const update = {};
  for (const k of allowed) {
    if (payload?.[k] !== undefined) update[k] = payload[k];
  }
  const imgFields = normalizeImageFields(payload?.image, payload?.imagePublicId);
  Object.assign(update, imgFields);

  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }
  if (update.frontContent !== undefined) update.frontContent = sanitizeContent(update.frontContent);
  if (update.backContent !== undefined) update.backContent = sanitizeContent(update.backContent);

  const oldPublicIdToDestroy =
    "image" in imgFields &&
    existing.imagePublicId &&
    existing.imagePublicId !== imgFields.imagePublicId
      ? existing.imagePublicId
      : null;

  const updated = await Card.findOneAndUpdate(
    { _id: cardId, userId },
    update,
    { new: true, runValidators: true },
  ).lean();

  if (oldPublicIdToDestroy) await destroyCloudinaryImage(oldPublicIdToDestroy);
  return updated;
}

export async function deleteCard(userId, cardId) {
  const deleted = await Card.findOneAndDelete({ _id: cardId, userId });
  if (!deleted) throw ApiError.notFound("Card not found");
  if (deleted.imagePublicId) {
    await destroyCloudinaryImage(deleted.imagePublicId);
  }
  await Deck.updateOne({ _id: deleted.deckId }, { $inc: { cardCount: -1 } });
  return { deleted: true };
}

export async function addCardsFromVocab(userId, deckId, userVocabularyIds) {
  if (!Array.isArray(userVocabularyIds) || userVocabularyIds.length === 0) {
    throw ApiError.badRequest("userVocabularyIds must be a non-empty array");
  }
  if (userVocabularyIds.length > DECK_LIMITS.BULK_FROM_VOCAB_MAX) {
    throw ApiError.badRequest(
      `Too many ids (max ${DECK_LIMITS.BULK_FROM_VOCAB_MAX})`,
    );
  }
  await _assertDeckOwnership(userId, deckId);

  const userVocabs = await UserVocabulary.find({
    _id: { $in: userVocabularyIds },
    userId,
  }).lean();

  if (userVocabs.length !== userVocabularyIds.length) {
    throw ApiError.badRequest("Some IDs invalid or not yours");
  }

  const vocabIds = userVocabs.map((uv) => uv.vocabularyId);
  const vocabs = await vocabularyService.getDictionaryByIds(vocabIds);
  const vocabById = new Map(vocabs.map((v) => [String(v._id), v]));

  const payloads = userVocabs.map((uv) => {
    const v = vocabById.get(String(uv.vocabularyId));
    if (!v) return null;
    const meaning = v.definitions?.[0]?.viDef || "";
    const example = v.definitions?.[0]?.example?.engEx;
    return {
      deckId,
      userId,
      frontContent: sanitizeContent(`<p>${v.word}</p>`),
      backContent: sanitizeContent(`<p>${meaning}</p>`),
      ...(v.ipa && { ipa: v.ipa }),
      ...(example && { example }),
      ...(v.audio && { audio: v.audio }),
      tags: [],
    };
  }).filter(Boolean);

  const created = await Card.insertMany(payloads);
  await Deck.updateOne(
    { _id: deckId },
    { $inc: { cardCount: payloads.length } },
  );
  return { created: payloads.length, cards: created };
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getShuffledStudyCards(userId, deckId) {
  await _assertDeckOwnership(userId, deckId);
  const cards = await Card.find({ deckId }).lean();
  return _shuffle(cards);
}

export async function rateCard(userId, cardId, payload) {
  const { mode = CARD_STUDY_MODE.FLIP, known } = payload || {};
  if (mode !== CARD_STUDY_MODE.FLIP) {
    throw ApiError.badRequest(`Mode '${mode}' not supported yet`);
  }
  if (typeof known !== "boolean") {
    throw ApiError.badRequest("known must be a boolean");
  }

  const incField = known ? "mode.flip.knownCount" : "mode.flip.unknownCount";
  const updated = await Card.findOneAndUpdate(
    { _id: cardId, userId },
    {
      $inc: { "mode.flip.studyCount": 1, [incField]: 1 },
      $set: { "mode.flip.lastStudiedAt": new Date() },
    },
    { new: true },
  ).lean();
  if (!updated) throw ApiError.notFound("Card not found");
  return updated;
}

export async function listCards(userId, deckId, filters, pagination) {
  await _assertDeckOwnership(userId, deckId);
  const { tag, search, sortBy, order } = filters || {};
  const { page, limit } = pagination;
  const query = {
    deckId,
    ...buildMultiFieldSearch(search, ["frontContent", "backContent"]),
  };
  if (tag) query.tags = String(tag).toLowerCase();
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
