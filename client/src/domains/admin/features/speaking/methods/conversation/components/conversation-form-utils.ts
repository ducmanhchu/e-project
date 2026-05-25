import { isAxiosError } from "axios";
import * as z from "zod";

import type {
	AdminConversationDetail,
	CreateAdminConversationPayload,
} from "@shared/types/conversation";
import type { WritingExerciseTopic } from "@shared/types/utils";
import { baseFilterSections } from "@shared/lib/utils";

const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

export const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

export const CONVERSATION_MIN_MESSAGES = 2;
export const CONVERSATION_MAX_MESSAGES = 20;
export const CONVERSATION_MAX_MESSAGE_LENGTH = 500;
export const CONVERSATION_MAX_SLANG_PER_MESSAGE = 3;

/** Lời thoại chỉnh sửa trong form */
export type EditableMessage = {
	_key: string;
	text: string;
};

/** Cụm từ slang chỉnh sửa trong form */
export type EditableSlang = {
	_key: string;
	messageIndex: number;
	term: string;
	meaning: string;
};

export type SpeakerForm = {
	name: string;
	persona: string;
};

const speakerSchema = z.object({
	name: z.string().trim().min(1, "Vui lòng nhập tên"),
	persona: z.string().optional(),
});

export const conversationBaseFormSchema = z.object({
	title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
	level: z.enum(["beginner", "intermediate", "advanced"]),
	topic: z.enum(topicValues),
	scenario: z.string().trim().min(1, "Vui lòng nhập bối cảnh"),
	speakerA: speakerSchema,
	speakerB: speakerSchema,
});

export const conversationCreateFormSchema = conversationBaseFormSchema;
export const conversationEditFormSchema = conversationBaseFormSchema;

export type ConversationCreateFormValues = z.infer<
	typeof conversationCreateFormSchema
>;
export type ConversationEditFormValues = z.infer<
	typeof conversationEditFormSchema
>;

export const conversationCreateDefaultValues: ConversationCreateFormValues = {
	title: "",
	level: "beginner",
	topic: "personal_communication",
	scenario: "",
	speakerA: { name: "", persona: "" },
	speakerB: { name: "", persona: "" },
};

function newKey(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function createEmptyMessage(): EditableMessage {
	return { _key: newKey("msg"), text: "" };
}

/** Mặc định 2 cell lời thoại (đủ điều kiện API tối thiểu + chẵn) */
export function createInitialMessages(): EditableMessage[] {
	return [createEmptyMessage(), createEmptyMessage()];
}

export function createEmptySlang(messageCount: number): EditableSlang {
	return {
		_key: newKey("slang"),
		messageIndex: Math.max(0, messageCount - 1),
		term: "",
		meaning: "",
	};
}

export function createInitialSlang(): EditableSlang[] {
	return [createEmptySlang(2)];
}

/** Thêm một lời thoại */
export function appendMessage(messages: EditableMessage[]): EditableMessage[] {
	if (messages.length >= CONVERSATION_MAX_MESSAGES) return messages;
	return [...messages, createEmptyMessage()];
}

export function speakerKeyForIndex(index: number): "A" | "B" {
	return index % 2 === 0 ? "A" : "B";
}

export function validateMessages(messages: EditableMessage[]): string | null {
	const count = messages.length;
	if (count < CONVERSATION_MIN_MESSAGES || count > CONVERSATION_MAX_MESSAGES) {
		return "Số lời thoại phải chẵn, tối thiểu 2, tối đa 20";
	}
	if (count % 2 !== 0) {
		return "Số lời thoại phải chẵn, tối thiểu 2, tối đa 20";
	}

	for (let i = 0; i < messages.length; i++) {
		const text = messages[i].text.trim();
		if (!text) {
			return "Vui lòng nhập nội dung cho tất cả lời thoại";
		}
		if (text.length > CONVERSATION_MAX_MESSAGE_LENGTH) {
			return `Lời thoại ${i + 1} vượt quá ${CONVERSATION_MAX_MESSAGE_LENGTH} ký tự`;
		}
	}
	return null;
}

function isSlangRowFilled(row: EditableSlang): boolean {
	return !!(row.term.trim() || row.meaning.trim());
}

export function validateSlangRows(
	rows: EditableSlang[],
	messageCount: number,
): string | null {
	const countByMessage = new Map<number, number>();

	for (const row of rows) {
		if (!isSlangRowFilled(row)) continue;

		if (row.messageIndex < 0 || row.messageIndex >= messageCount) {
			return "Thuộc lời thoại không hợp lệ";
		}
		if (!row.term.trim() || !row.meaning.trim()) {
			return "Cụm từ: nhập đủ Từ và Nghĩa";
		}

		const current = countByMessage.get(row.messageIndex) ?? 0;
		if (current >= CONVERSATION_MAX_SLANG_PER_MESSAGE) {
			return "Mỗi lời thoại tối đa 3 cụm từ";
		}
		countByMessage.set(row.messageIndex, current + 1);
	}
	return null;
}

export function toConversationPayload(
	values: ConversationCreateFormValues,
	messages: EditableMessage[],
	slangRows: EditableSlang[],
): CreateAdminConversationPayload {
	const slangByIndex = new Map<
		number,
		{ term: string; meaning: string }[]
	>();

	for (const row of slangRows) {
		if (!isSlangRowFilled(row)) continue;
		const list = slangByIndex.get(row.messageIndex) ?? [];
		list.push({
			term: row.term.trim(),
			meaning: row.meaning.trim(),
		});
		slangByIndex.set(row.messageIndex, list);
	}

	const apiMessages = messages.map((msg, index) => ({
		order: index,
		speakerKey: speakerKeyForIndex(index),
		text: msg.text.trim(),
		slang: slangByIndex.get(index) ?? [],
	}));

	return {
		title: values.title.trim(),
		level: values.level,
		topic: values.topic,
		mode: "single_role",
		scenario: values.scenario.trim(),
		speakers: [
			{
				key: "A",
				name: values.speakerA.name.trim(),
				persona: values.speakerA.persona?.trim() ?? "",
			},
			{
				key: "B",
				name: values.speakerB.name.trim(),
				persona: values.speakerB.persona?.trim() ?? "",
			},
		],
		messages: apiMessages,
	};
}

export function exerciseToFormValues(
	detail: AdminConversationDetail,
): ConversationEditFormValues {
	const speakerA = detail.speakers.find((s) => s.key === "A");
	const speakerB = detail.speakers.find((s) => s.key === "B");

	return {
		title: detail.title,
		level: detail.level,
		topic: detail.topic,
		scenario: detail.scenario,
		speakerA: {
			name: speakerA?.name ?? "",
			persona: speakerA?.persona ?? "",
		},
		speakerB: {
			name: speakerB?.name ?? "",
			persona: speakerB?.persona ?? "",
		},
	};
}

export function exerciseToEditableMessages(
	detail: AdminConversationDetail,
): EditableMessage[] {
	return [...detail.messages]
		.sort((a, b) => a.order - b.order)
		.map((m, index) => ({
			_key: `msg-${m.order}-${index}`,
			text: m.text,
		}));
}

export function exerciseToEditableSlang(
	detail: AdminConversationDetail,
): EditableSlang[] {
	const rows: EditableSlang[] = [];
	const sorted = [...detail.messages].sort((a, b) => a.order - b.order);

	for (const message of sorted) {
		for (const slang of message.slang) {
			rows.push({
				_key: `slang-${message.order}-${slang.term}`,
				messageIndex: message.order,
				term: slang.term,
				meaning: slang.meaning,
			});
		}
	}

	return rows.length > 0 ? rows : createInitialSlang();
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (isAxiosError(error)) {
		const msg = error.response?.data?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return fallback;
}
