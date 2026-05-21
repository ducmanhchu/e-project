import { isAxiosError } from "axios";
import * as z from "zod";

import type { AdminParaphraseListItem } from "@shared/types/paraphrase";
import type { WritingExerciseTopic } from "@shared/types/utils";
import { baseFilterSections } from "@shared/lib/utils";

export const ADMIN_LIST_QUERY_KEY = ["admin", "paraphrase", "list"] as const;

const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

export const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

export function parseSemicolonSentences(raw: string): string[] {
	return raw
		.split(";")
		.map((s) => s.trim())
		.filter(Boolean);
}

const sentencesRawField = z.string().superRefine((raw, ctx) => {
	const parsed = parseSemicolonSentences(raw);
	if (parsed.length === 0) {
		ctx.addIssue({
			code: "custom",
			message: "Vui lòng nhập ít nhất một câu hỏi",
		});
	}
});

const sentencesRawOptionalField = z.string().superRefine((raw, ctx) => {
	if (!raw.trim()) return;
	const parsed = parseSemicolonSentences(raw);
	if (parsed.length === 0) {
		ctx.addIssue({
			code: "custom",
			message: "Vui lòng nhập ít nhất một câu hỏi hợp lệ",
		});
	}
});

export const paraphraseBaseFormSchema = z.object({
	title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
	level: z.enum(["beginner", "intermediate", "advanced"]),
	topic: z.enum(topicValues),
});

export const paraphraseCreateFormSchema = paraphraseBaseFormSchema.extend({
	sentencesRaw: sentencesRawField,
});

export const paraphraseEditFormSchema = paraphraseBaseFormSchema.extend({
	sentencesRaw: sentencesRawOptionalField,
});

export type ParaphraseCreateFormValues = z.infer<
	typeof paraphraseCreateFormSchema
>;
export type ParaphraseEditFormValues = z.infer<typeof paraphraseEditFormSchema>;

export const paraphraseCreateDefaultValues: ParaphraseCreateFormValues = {
	title: "",
	level: "beginner",
	topic: "personal_communication",
	sentencesRaw: "",
};

export function exerciseToFormValues(
	exercise: AdminParaphraseListItem,
): ParaphraseEditFormValues {
	return {
		title: exercise.title,
		level: exercise.level,
		topic: exercise.topic,
		sentencesRaw: "",
	};
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (isAxiosError(error)) {
		const msg = error.response?.data?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return fallback;
}

export function buildSentencesPayload(raw: string) {
	return parseSemicolonSentences(raw).map((targetSentence) => ({
		targetSentence,
	}));
}
