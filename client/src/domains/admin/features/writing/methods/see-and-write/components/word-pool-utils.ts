import type { SAWAdminExercise } from "@shared/types/see-and-write";

type WordPoolEntry = SAWAdminExercise["wordPool"][number];

/** Từ khóa chỉnh sửa — chỉ cho sửa trường word; metadata giữ nguyên từ DB */
export type SAWEditableWord = {
	_key: string;
	word: string;
	ipa: string;
	partOfSpeech: string;
	meaning: string;
};

/** Map word pool hiện có sang state chỉnh sửa */
export function wordPoolToEditableWords(
	entries: WordPoolEntry[],
): SAWEditableWord[] {
	return entries.map((entry, index) => ({
		_key: `word-${entry.id}-${index}`,
		word: entry.word,
		ipa: entry.ipa ?? "",
		partOfSpeech: entry.partOfSpeech ?? "",
		meaning: entry.meaning ?? "",
	}));
}

/** Tạo dòng trống để admin nhập từ mới */
export function createEmptyEditableWord(): SAWEditableWord {
	return {
		_key: `word-manual-${crypto.randomUUID()}`,
		word: "",
		ipa: "",
		partOfSpeech: "",
		meaning: "",
	};
}

/** Chuyển state chỉnh sửa sang payload API (bỏ dòng trống) */
export function toWordPayload(words: SAWEditableWord[]): string[] {
	return words.filter((w) => w.word.trim()).map((w) => w.word.trim());
}
