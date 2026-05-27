import { Folder } from "@server/models/deck/Folder";
import { Deck } from "@server/models/deck/Deck";
import { Card } from "@server/models/deck/Card";
import { ApiError } from "@server/helpers/ApiError";
import { destroyCloudinaryImage } from "@server/helpers/imageFields";
import { validateObjectId } from "@server/helpers/validateFields";
import { resolveSort, buildTextSearch } from "@server/helpers/listQuery";

const FOLDER_SORT_FIELDS = new Set(["createdAt", "updatedAt", "name"]);

async function _assertFolderOwnership(userId, folderId) {
	const folder = await Folder.findOne({ _id: folderId, userId }).lean();
	if (!folder) throw ApiError.notFound("Folder not found");
	return folder;
}

export async function createFolder(userId, payload) {
	const { name } = payload || {};
	if (!name || typeof name !== "string" || !name.trim()) {
		throw ApiError.badRequest("name is required");
	}
	return Folder.create({ userId, name: name.trim() });
}

export async function listMyFolders(userId, filters, pagination) {
	const { search, sortBy, order } = filters || {};
	const { page, limit } = pagination;
	const query = { userId, ...buildTextSearch(search, "name") };
	const sort = resolveSort(FOLDER_SORT_FIELDS, sortBy, order);
	const [items, total] = await Promise.all([
		Folder.find(query)
			.sort(sort)
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		Folder.countDocuments(query),
	]);

	if (items.length === 0) return { items: [], total };

	const folderIds = items.map((f) => f._id);
	const counts = await Deck.aggregate([
		{ $match: { userId, folderId: { $in: folderIds } } },
		{ $group: { _id: "$folderId", count: { $sum: 1 } } },
	]);
	const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

	return {
		items: items.map((f) => ({
			...f,
			deckCount: countMap.get(String(f._id)) || 0,
		})),
		total,
	};
}

export async function getMyFolderById(userId, folderId) {
	return _assertFolderOwnership(userId, folderId);
}

export async function updateFolder(userId, folderId, payload) {
	await _assertFolderOwnership(userId, folderId);
	const { name } = payload || {};
	if (name === undefined)
		throw ApiError.badRequest("No valid fields to update");
	if (typeof name !== "string" || !name.trim()) {
		throw ApiError.badRequest("name must be a non-empty string");
	}
	return Folder.findOneAndUpdate(
		{ _id: folderId, userId },
		{ name: name.trim() },
		{ new: true, runValidators: true },
	).lean();
}

export async function deleteFolder(userId, folderId) {
	await _assertFolderOwnership(userId, folderId);

	const decks = await Deck.find({ folderId, userId })
		.select("_id imagePublicId")
		.lean();

	if (decks.length === 0) {
		await Folder.findOneAndDelete({ _id: folderId, userId });
		return { deleted: true, deletedDecks: 0, deletedCards: 0 };
	}

	const deckIds = decks.map((d) => d._id);
	const cardCount = await Card.countDocuments({ deckId: { $in: deckIds } });

	const publicIds = decks
		.filter((d) => d.imagePublicId)
		.map((d) => d.imagePublicId);
	await Promise.allSettled(publicIds.map(destroyCloudinaryImage));

	await Card.deleteMany({ deckId: { $in: deckIds } });
	await Deck.deleteMany({ _id: { $in: deckIds }, userId });
	await Folder.findOneAndDelete({ _id: folderId, userId });

	return {
		deleted: true,
		deletedDecks: decks.length,
		deletedCards: cardCount,
	};
}

export async function assertFolderBelongsToUser(userId, folderId) {
	if (folderId == null) return;
	validateObjectId(folderId, "folderId");
	const folder = await Folder.findOne({ _id: folderId, userId })
		.select("_id")
		.lean();
	if (!folder) throw ApiError.badRequest("folderId invalid or not yours");
}
