import { isAxiosError } from "axios";
import * as z from "zod";

import type { AdminParaphraseListItem } from "@shared/types/paraphrase";
import type { WritingExerciseTopic } from "@shared/types/utils";
import { baseFilterSections } from "@shared/lib/utils";

const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

export const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

/** Câu hỏi chỉnh sửa trong form tạo/sửa bài */
export type ParaphraseEditableSentence = {
	_key: string;
	order: number;
	targetSentence: string;
};

/** Map câu hỏi hiện có sang state chỉnh sửa */
export function exerciseToEditableSentences(
	exercise: AdminParaphraseListItem,
): ParaphraseEditableSentence[] {
	return [...exercise.sentences]
		.sort((a, b) => a.order - b.order)
		.map((sentence, index) => ({
			_key: `sentence-${sentence.order}-${index}`,
			order: sentence.order,
			targetSentence: sentence.targetSentence,
		}));
}

/** Tạo dòng trống với STT cao nhất + 1 */
export function createEmptyEditableSentence(
	sentences: ParaphraseEditableSentence[],
): ParaphraseEditableSentence {
	const maxOrder = sentences.reduce(
		(max, sentence) => Math.max(max, sentence.order),
		0,
	);

	return {
		_key: `sentence-manual-${crypto.randomUUID()}`,
		order: maxOrder + 1,
		targetSentence: "",
	};
}

/** State mặc định khi tạo bài — một dòng trống STT 1 */
export function createInitialEditableSentences(): ParaphraseEditableSentence[] {
	return [createEmptyEditableSentence([])];
}

/** Chuyển state chỉnh sửa sang payload API (bỏ dòng trống, giữ thứ tự STT) */
export function toSentencesUpdatePayload(
	sentences: ParaphraseEditableSentence[],
) {
	return [...sentences]
		.sort((a, b) => a.order - b.order)
		.filter((sentence) => sentence.targetSentence.trim())
		.map((sentence) => ({
			targetSentence: sentence.targetSentence.trim(),
		}));
}

export const paraphraseBaseFormSchema = z.object({
	title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
	level: z.enum(["beginner", "intermediate", "advanced"]),
	topic: z.enum(topicValues),
});

export const paraphraseCreateFormSchema = paraphraseBaseFormSchema;

export const paraphraseEditFormSchema = paraphraseBaseFormSchema;

export type ParaphraseCreateFormValues = z.infer<
	typeof paraphraseCreateFormSchema
>;
export type ParaphraseEditFormValues = z.infer<typeof paraphraseEditFormSchema>;

export const paraphraseCreateDefaultValues: ParaphraseCreateFormValues = {
	title: "",
	level: "beginner",
	topic: "personal_communication",
};

export function exerciseToFormValues(
	exercise: AdminParaphraseListItem,
): ParaphraseEditFormValues {
	return {
		title: exercise.title,
		level: exercise.level,
		topic: exercise.topic,
	};
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (isAxiosError(error)) {
		const msg = error.response?.data?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return fallback;
}
