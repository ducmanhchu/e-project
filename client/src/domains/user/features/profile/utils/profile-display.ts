import type { AttemptHistoryItem } from "@/shared/types/progress";

const LESSON_TYPE_LABELS = {
	ReverseTranslation: "Dịch ngược",
	SeeWrite: "Quan sát và Viết",
	Rewrite: "Viết lại câu",
	Exam: "Đề thi",
	WordChain: "Nối từ",
	SlangHang: "Hội thoại",
} as const;

export type ProfileLessonKind = keyof typeof LESSON_TYPE_LABELS;

const WRITING_LESSON_TYPES = [
	"ReverseTranslation",
	"SeeWrite",
	"Rewrite",
] as const;

export type WritingLessonType = (typeof WRITING_LESSON_TYPES)[number];

/** Các kind không hiển thị trong bảng lịch sử */
const HIDDEN_HISTORY_KINDS = new Set<ProfileLessonKind>(["Exam", "WordChain"]);

/**
 * Nhãn tiếng Việt cho lessonType / kind.
 * @param kind — loại bài từ API
 * @returns Chuỗi hiển thị hoặc kind gốc nếu không map được
 */
export function translateLessonKind(kind: string | undefined): string {
	if (!kind) return "—";
	return LESSON_TYPE_LABELS[kind as ProfileLessonKind] ?? kind;
}

/**
 * Đường dẫn bài tập theo kind và id.
 * @param kind — loại bài
 * @param id — id bài học
 * @returns path hoặc null nếu không điều hướng được
 */
export function getExercisePath(
	kind: AttemptHistoryItem["kind"],
	id: string,
): string | null {
	switch (kind) {
		case "ReverseTranslation":
			return `/writing/reverse-translate/${id}`;
		case "SeeWrite":
			return `/writing/see-and-write/${id}`;
		case "Rewrite":
			return `/writing/paraphrase/${id}`;
		case "SlangHang":
			return `/speaking/conversation/${id}`;
		default:
			return null;
	}
}

/**
 * Có hiển thị dòng lịch sử hay không (bỏ Exam, WordChain).
 * @param kind — loại bài
 */
export function isHistoryRowVisible(
	kind: AttemptHistoryItem["kind"] | undefined,
): boolean {
	if (!kind) return false;
	return !HIDDEN_HISTORY_KINDS.has(kind as ProfileLessonKind);
}

/**
 * Định dạng thời gian hoàn thành: HH:mm dd/MM/yyyy (24h).
 * @param iso — chuỗi ISO từ API
 */
export function formatCompletedAt(iso: string): string {
	const date = new Date(iso);
	const time = new Intl.DateTimeFormat("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
	const day = new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
	return `${time} ${day}`;
}

/**
 * Định dạng ngày khởi tạo tài khoản.
 * @param iso — chuỗi ISO từ API
 */
export function formatCreatedAt(iso: string): string {
	return new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(iso));
}

/**
 * Nhãn tiếng Việt cho lessonType luyện viết.
 * @param lessonType — ReverseTranslation | SeeWrite | Rewrite
 */
export function translateWritingLessonType(
	lessonType: WritingLessonType,
): string {
	return LESSON_TYPE_LABELS[lessonType];
}

export { WRITING_LESSON_TYPES };
