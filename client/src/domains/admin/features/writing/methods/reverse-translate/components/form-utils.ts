import { isAxiosError } from "axios";
import * as z from "zod";

import type {
	AdminRTExercise,
	RTCreateLessonData,
	RTDictionaryEntry,
	RTPreviewSentence,
	RTPreviewVocabulary,
	RTUpdatePayload,
} from "@shared/types/reverse-translate";
import type { WritingContentType, WritingExerciseTopic } from "@shared/types/utils";
import { baseFilterSections } from "@shared/lib/utils";

import { contentTypeFilterOptions } from "@admin/features/writing/methods/reverse-translate/components/form-options";

const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

export const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

export const contentTypeValues = contentTypeFilterOptions.map(
	(o) => o.id,
) as [WritingContentType, ...WritingContentType[]];

export const rtMetadataSchema = z.object({
	title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
	level: z.enum(["beginner", "intermediate", "advanced"]),
	topic: z.enum(topicValues),
	contentType: z.enum(contentTypeValues),
});

export type RTMetadataValues = z.infer<typeof rtMetadataSchema>;

export const rtCreateStep1Schema = rtMetadataSchema.extend({
	paragraph: z.string().trim().min(1, "Vui lòng nhập văn bản tiếng Anh"),
});

export type RTCreateStep1Values = z.infer<typeof rtCreateStep1Schema>;

export const rtEditFormSchema = rtMetadataSchema;

export type RTEditFormValues = RTMetadataValues;

export const rtCreateStep1DefaultValues: RTCreateStep1Values = {
	title: "",
	level: "beginner",
	topic: "personal_communication",
	contentType: "general",
	paragraph: "",
};

/** Từ vựng chỉnh sửa ở bước 2 — chỉnh sentenceIndex + word; ipa/loại từ/nghĩa chỉ đọc */
export type RTEditableVocab = {
	_key: string;
	sentenceIndex: number;
	word: string;
	partOfSpeech: string;
	ipa: string;
	meaning: string;
	example: string;
};

/** Lấy nghĩa hiển thị từ definitions (ưu tiên tiếng Việt) */
export function formatVocabMeaning(
	definitions: AdminRTExercise["vocabulary"][number]["definitions"],
): string {
	const def = definitions[0];
	return def?.viDef?.trim() || def?.engDef?.trim() || "";
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (isAxiosError(error)) {
		const body = error.response?.data as
			| { error?: string; message?: string }
			| undefined;
		const msg = body?.error ?? body?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return fallback;
}

export function extractLessonId(lesson: RTCreateLessonData): string {
	if (lesson.id) return String(lesson.id);
	if (lesson._id) return String(lesson._id);
	throw new Error("Missing lesson id in create response");
}

export function buildVietnameseParagraph(sentences: RTPreviewSentence[]): string {
	return sentences
		.map((s) => s.vietnameseText.trim())
		.filter(Boolean)
		.join(" ");
}

export function mapPreviewVocabulary(
	items: RTPreviewVocabulary[],
): RTEditableVocab[] {
	return items.map((v, i) => ({
		_key: `vocab-${i}-${v.word}`,
		sentenceIndex: v.sentenceIndex,
		word: v.word,
		partOfSpeech: v.partOfSpeech,
		ipa: "",
		meaning: v.meaning,
		example: v.example,
	}));
}

/** Tạo dòng từ vựng trống để admin nhập thủ công ở bước 2 */
export function createManualVocabEntry(
	defaultSentenceIndex = 1,
): RTEditableVocab {
	return {
		_key: `vocab-manual-${crypto.randomUUID()}`,
		sentenceIndex: defaultSentenceIndex,
		word: "",
		partOfSpeech: "",
		ipa: "",
		meaning: "",
		example: "",
	};
}

export function toDictionaryPayload(
	vocabulary: RTEditableVocab[],
): RTDictionaryEntry[] {
	return vocabulary
		.filter((v) => v.word.trim())
		.map((v) => ({
			word: v.word.trim(),
			partOfSpeech: v.partOfSpeech.trim() || "word",
			example: v.example.trim() || undefined,
			sentenceIndex: v.sentenceIndex > 0 ? v.sentenceIndex : null,
		}));
}

export function validateStep2BeforeSave(
	sentences: RTPreviewSentence[],
): string | null {
	if (sentences.length === 0) return "Cần ít nhất một câu sau khi phân tích.";
	for (let i = 0; i < sentences.length; i++) {
		const s = sentences[i];
		if (!s.referenceAnswer.trim() || !s.vietnameseText.trim()) {
			return `Câu ${i + 1}: vui lòng nhập đủ tiếng Anh và tiếng Việt.`;
		}
	}
	return null;
}

export function exerciseToEditFormValues(
	exercise: AdminRTExercise,
): RTEditFormValues {
	return {
		title: exercise.title,
		level: exercise.level,
		topic: exercise.topic,
		contentType: exercise.contentType,
	};
}

export function exerciseToSentences(
	exercise: AdminRTExercise,
): RTPreviewSentence[] {
	return [...exercise.sentences]
		.sort((a, b) => a.order - b.order)
		.map((s) => ({
			order: s.order,
			referenceAnswer: s.referenceAnswer,
			vietnameseText: s.vietnameseText,
		}));
}

/** Map từ vựng hiện có của bài sang state chỉnh sửa (bước 2 create) */
export function exerciseToVocabulary(
	exercise: AdminRTExercise,
): RTEditableVocab[] {
	return exercise.vocabulary.map((v, i) => ({
		_key: `vocab-${v.vocabularyId}-${i}`,
		sentenceIndex: v.sentenceIndex ?? 1,
		word: v.word,
		partOfSpeech: v.partOfSpeech,
		ipa: v.ipa,
		meaning: formatVocabMeaning(v.definitions),
		example:
			v.definitions[0]?.example?.engEx?.trim() ??
			v.definitions[0]?.example?.viEx?.trim() ??
			"",
	}));
}

/**
 * Payload từ vựng khi update — gửi toàn bộ danh sách hiện tại (cũ + mới/sửa),
 * backend ghi đè vocabularyRefs.
 */
export function toUpdateVocabularyPayload(
	vocabulary: RTEditableVocab[],
): RTUpdatePayload["vocabulary"] {
	return vocabulary
		.filter((v) => v.word.trim())
		.map((v) => ({
			word: v.word.trim(),
			sentenceIndex: v.sentenceIndex > 0 ? v.sentenceIndex : 1,
		}));
}

/** Luôn gửi toàn bộ câu và từ vựng — backend ghi đè khi cập nhật */
export function buildUpdatePayload(
	values: RTEditFormValues,
	sentences: RTPreviewSentence[],
	vocabulary: RTEditableVocab[],
): RTUpdatePayload {
	return {
		title: values.title.trim(),
		level: values.level,
		topic: values.topic,
		contentType: values.contentType,
		vietnameseParagraph: buildVietnameseParagraph(sentences),
		sentences: sentences.map((s) => ({
			vietnameseText: s.vietnameseText.trim(),
			referenceAnswer: s.referenceAnswer.trim(),
		})),
		vocabulary: toUpdateVocabularyPayload(vocabulary),
	};
}
