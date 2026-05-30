import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { prepareContentByType } from "@server/helpers/writing/prepareContentByType";
import {
	getModelByType,
	findLessonById,
} from "@server/helpers/writing/getWritingModel";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { aiPreviewWriting } from "@server/services/ai/previewProvider";
import { normalizeWord } from "@server/helpers/writing/normalizeWord";
import { ensureEnriched } from "@server/services/vocabularyService";

/**
 * Bước 1 (Preview): Admin gửi đoạn văn tiếng Anh
 * → AI tách câu + dịch tiếng Việt + trả vocabulary mỗi câu
 * → Chưa lưu DB
 */
export async function previewWriting(body) {
	const { paragraph, type, contentType, topic, title, level, description } =
		body;

	if (!paragraph || typeof paragraph !== "string" || !paragraph.trim()) {
		throw ApiError.badRequest("paragraph is required");
	}

	const context = { type, contentType, topic, title, level, description };
	const { result: parsed, provider } = await aiPreviewWriting(
		paragraph,
		context,
	);

	const sentences = parsed.results.map((s, i) => ({
		order: i + 1,
		referenceAnswer: s.referenceAnswer.trim(),
		vietnameseText: s.vietnameseText.trim(),
	}));

	const seen = new Set();
	const vocabulary = parsed.results.flatMap((s, i) =>
		(s.vocabulary || []).reduce((acc, v) => {
			const word = normalizeWord(v.word, v.partOfSpeech, s.referenceAnswer);
			if (!seen.has(word)) {
				seen.add(word);
				acc.push({
					sentenceIndex: i + 1,
					word,
					partOfSpeech: v.partOfSpeech,
					meaning: v.meaning,
					example: v.example,
				});
			}
			return acc;
		}, []),
	);

	return {
		vietnameseParagraph: parsed.vietnameseParagraph,
		sentences,
		vocabulary,
		provider,
	};
}

/**
 * Bước 2: Admin review/chỉnh sửa xong → tạo lesson (draft)
 */
export async function createWriting(body) {
	validateFields(body, ["title", "type", "level"]);

	const Model = getModelByType(body.type);
	if (!Model) throw ApiError.badRequest(`Invalid writing type: ${body.type}`);

	const { fields, totalSentences } = prepareContentByType(body.type, body);

	const lesson = await Model.create({
		title: body.title,
		level: body.level,
		contentType: body.contentType,
		topic: body.topic,
		description: body.description,
		totalSentences,
		...fields,
	});

	return lesson;
}

/**
 * Validate danh sách từ vựng gửi kèm update/create dictionary.
 * @param {unknown[]} vocabulary
 * @param {number} totalSentences
 */
export function validateVocabularyEntries(vocabulary, totalSentences) {
	if (!Array.isArray(vocabulary)) {
		throw ApiError.badRequest("vocabulary must be an array");
	}

	for (let i = 0; i < vocabulary.length; i++) {
		const entry = vocabulary[i];
		const word = typeof entry?.word === "string" ? entry.word.trim() : "";
		if (!word) {
			throw ApiError.badRequest(`vocabulary[${i}].word is required`);
		}

		if (entry.sentenceIndex != null) {
			const idx = Number(entry.sentenceIndex);
			if (!Number.isInteger(idx) || idx < 1 || idx > totalSentences) {
				throw ApiError.badRequest(
					`vocabulary[${i}].sentenceIndex must be between 1 and ${totalSentences}`,
				);
			}
		}
	}
}

/**
 * Upsert từ vựng vào collection Vocabulary, trả refs gắn lesson.
 * @param {Array<{ word: string, partOfSpeech?: string, example?: string, sentenceIndex?: number | null }>} entries
 * @param {Map<number, string>} [sentenceRefByIndex] order → referenceAnswer (context normalize)
 * @returns {Promise<Array<{ id: import("mongoose").Types.ObjectId, sentenceIndex: number | null }>>}
 */
export async function buildVocabularyRefs(
	entries,
	sentenceRefByIndex = new Map(),
) {
	return Promise.all(
		entries.map(async (e) => {
			const word = e.word.trim();
			const partOfSpeech = e.partOfSpeech?.trim() || "word";
			const context =
				(typeof e.example === "string" && e.example.trim()) ||
				(e.sentenceIndex != null
					? sentenceRefByIndex.get(Number(e.sentenceIndex))
					: undefined);

			const normalized = normalizeWord(word, partOfSpeech, context);
			const vocab = await Vocabulary.findOneAndUpdate(
				{ word: normalized },
				{
					$setOnInsert: {
						word: normalized,
						partOfSpeech,
						definitions: [],
					},
				},
				{ upsert: true, new: true },
			);

			if (!vocab.definitions || vocab.definitions.length === 0) {
				ensureEnriched(vocab).catch((err) =>
					console.error(`[enrich] Failed for "${vocab.word}":`, err.message),
				);
			}

			return {
				id: vocab._id,
				sentenceIndex: e.sentenceIndex ?? null,
			};
		}),
	);
}

/**
 * Bước 3: Admin lưu vocabulary cho lesson
 * Upsert mỗi entry vào Vocabulary collection, lưu refs vào lesson
 */
export async function saveDictionary(lessonId, entries) {
	if (!Array.isArray(entries) || entries.length === 0) {
		throw ApiError.badRequest("entries must be a non-empty array");
	}

	const found = await findLessonById(lessonId);
	if (!found) throw ApiError.notFound("Writing lesson not found");

	const Model = getModelByType(found.type);
	const vocabRefs = await buildVocabularyRefs(entries);

	await Model.findByIdAndUpdate(lessonId, {
		$set: { vocabularyRefs: vocabRefs },
	});

	return { saved: vocabRefs.length };
}
