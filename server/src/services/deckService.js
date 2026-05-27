import { Deck } from "@server/models/deck/Deck";
import { Card } from "@server/models/deck/Card";
import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { ApiError } from "@server/helpers/ApiError";
import {
	normalizeImageFields,
	destroyCloudinaryImage,
} from "@server/helpers/imageFields";
import {
	DECK_LIMITS,
	CARD_STATUS,
	CARD_STATUS_VALUES,
} from "@server/const/deck";
import * as vocabularyService from "@server/services/vocabularyService";
import { assertFolderBelongsToUser } from "@server/services/folderService";
import {
	resolveSort,
	buildTextSearch,
	buildMultiFieldSearch,
} from "@server/helpers/listQuery";

const DECK_SORT_FIELDS = new Set(["createdAt", "updatedAt", "name"]);
const CARD_SORT_FIELDS = new Set(["createdAt", "updatedAt"]);

/**
 * Chuẩn hóa plain text cho field card.
 * @param {unknown} value
 * @param {number} maxLen
 * @param {string} fieldName
 * @param {{ required?: boolean }} [opts]
 * @returns {string | undefined}
 */
function _trimPlainField(value, maxLen, fieldName, opts = {}) {
	if (value === undefined || value === null) return undefined;
	const trimmed = String(value).trim();
	if (opts.required && !trimmed) {
		throw ApiError.badRequest(`${fieldName} is required`);
	}
	if (trimmed.length > maxLen) {
		throw ApiError.badRequest(`${fieldName} max ${maxLen} chars`);
	}
	return trimmed || undefined;
}

/**
 * @param {unknown} status
 * @returns {string}
 */
function _parseCardStatus(status) {
	if (!CARD_STATUS_VALUES.includes(status)) {
		throw ApiError.badRequest(
			`status must be "${CARD_STATUS.KNOWN}" or "${CARD_STATUS.UNKNOWN}"`,
		);
	}
	return status;
}

async function _assertDeckOwnership(userId, deckId) {
	const deck = await Deck.findOne({ _id: deckId, userId }).lean();
	if (!deck) throw ApiError.notFound("Deck not found");
	return deck;
}

export async function createDeck(userId, payload) {
	const {
		name,
		description,
		visibility,
		tags,
		image,
		imagePublicId,
		folderId,
	} = payload || {};
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
	const imgFields = normalizeImageFields(
		payload?.image,
		payload?.imagePublicId,
	);
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

	const updated = await Deck.findOneAndUpdate({ _id: deckId, userId }, update, {
		new: true,
		runValidators: true,
	}).lean();

	if (oldPublicIdToDestroy) await destroyCloudinaryImage(oldPublicIdToDestroy);
	return updated;
}

export async function deleteDeck(userId, deckId) {
	const deck = await _assertDeckOwnership(userId, deckId);
	const publicIds = deck.imagePublicId ? [deck.imagePublicId] : [];
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
	const { word, meaning, ipa, partOfSpeech, enExample, viExample, audio } =
		payload || {};

	const doc = {
		deckId,
		userId,
		word: _trimPlainField(word, DECK_LIMITS.WORD_MAX, "word", {
			required: true,
		}),
		meaning: _trimPlainField(meaning, DECK_LIMITS.MEANING_MAX, "meaning", {
			required: true,
		}),
		...(ipa !== undefined && {
			ipa: _trimPlainField(ipa, DECK_LIMITS.IPA_MAX, "ipa"),
		}),
		...(partOfSpeech !== undefined && {
			partOfSpeech: _trimPlainField(
				partOfSpeech,
				DECK_LIMITS.PART_OF_SPEECH_MAX,
				"partOfSpeech",
			),
		}),
		...(enExample !== undefined && {
			enExample: _trimPlainField(
				enExample,
				DECK_LIMITS.EN_EXAMPLE_MAX,
				"enExample",
			),
		}),
		...(viExample !== undefined && {
			viExample: _trimPlainField(
				viExample,
				DECK_LIMITS.VI_EXAMPLE_MAX,
				"viExample",
			),
		}),
		...(audio !== undefined && { audio: String(audio).trim() || undefined }),
	};

	const card = await Card.create(doc);
	await Deck.updateOne({ _id: deckId }, { $inc: { cardCount: 1 } });
	return card;
}

export async function updateCard(userId, cardId, payload) {
	const existing = await Card.findOne({ _id: cardId, userId }).lean();
	if (!existing) throw ApiError.notFound("Card not found");

	if (payload?.deckId !== undefined) {
		throw ApiError.badRequest("deckId cannot be changed");
	}

	const allowed = [
		"word",
		"meaning",
		"ipa",
		"partOfSpeech",
		"enExample",
		"viExample",
		"audio",
		"status",
	];
	const update = {};
	for (const k of allowed) {
		if (payload?.[k] !== undefined) update[k] = payload[k];
	}

	if (Object.keys(update).length === 0) {
		throw ApiError.badRequest("No valid fields to update");
	}

	if (update.word !== undefined) {
		update.word = _trimPlainField(update.word, DECK_LIMITS.WORD_MAX, "word", {
			required: true,
		});
	}
	if (update.meaning !== undefined) {
		update.meaning = _trimPlainField(
			update.meaning,
			DECK_LIMITS.MEANING_MAX,
			"meaning",
			{ required: true },
		);
	}
	if (update.ipa !== undefined) {
		update.ipa = _trimPlainField(update.ipa, DECK_LIMITS.IPA_MAX, "ipa");
	}
	if (update.partOfSpeech !== undefined) {
		update.partOfSpeech = _trimPlainField(
			update.partOfSpeech,
			DECK_LIMITS.PART_OF_SPEECH_MAX,
			"partOfSpeech",
		);
	}
	if (update.enExample !== undefined) {
		update.enExample = _trimPlainField(
			update.enExample,
			DECK_LIMITS.EN_EXAMPLE_MAX,
			"enExample",
		);
	}
	if (update.viExample !== undefined) {
		update.viExample = _trimPlainField(
			update.viExample,
			DECK_LIMITS.VI_EXAMPLE_MAX,
			"viExample",
		);
	}
	if (update.audio !== undefined) {
		update.audio = String(update.audio).trim() || undefined;
	}
	if (update.status !== undefined) {
		update.status = _parseCardStatus(update.status);
	}

	const updated = await Card.findOneAndUpdate({ _id: cardId, userId }, update, {
		new: true,
		runValidators: true,
	}).lean();

	return updated;
}

export async function deleteCard(userId, cardId) {
	const deleted = await Card.findOneAndDelete({ _id: cardId, userId });
	if (!deleted) throw ApiError.notFound("Card not found");
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

	const payloads = userVocabs
		.map((uv) => {
			const v = vocabById.get(String(uv.vocabularyId));
			if (!v) return null;
			const def = v.definitions?.[0];
			const meaning = def?.viDef || "";
			if (!v.word?.trim() || !meaning.trim()) return null;
			return {
				deckId,
				userId,
				word: v.word.trim(),
				meaning: meaning.trim(),
				status: CARD_STATUS.UNKNOWN,
				...(v.partOfSpeech && { partOfSpeech: v.partOfSpeech.trim() }),
				...(v.ipa && { ipa: v.ipa.trim() }),
				...(def?.example?.engEx && { enExample: def.example.engEx.trim() }),
				...(def?.example?.viEx && { viExample: def.example.viEx.trim() }),
				...(v.audio && { audio: v.audio }),
			};
		})
		.filter(Boolean);

	if (payloads.length === 0) {
		throw ApiError.badRequest("No valid vocabulary entries to import");
	}

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

export async function listCards(userId, deckId, filters, pagination) {
	await _assertDeckOwnership(userId, deckId);
	const { search, status, sortBy, order, shuffle } = filters || {};
	const { page, limit } = pagination;

	const query = {
		deckId,
		...buildMultiFieldSearch(search, ["word", "meaning"]),
	};
	if (status !== undefined && status !== null && status !== "") {
		query.status = _parseCardStatus(status);
	}

	if (shuffle) {
		const all = await Card.find(query).lean();
		const total = all.length;
		const start = (page - 1) * limit;
		const items = _shuffle(all).slice(start, start + limit);
		return { items, total };
	}

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
