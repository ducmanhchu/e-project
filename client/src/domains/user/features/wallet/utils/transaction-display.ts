import type { TransactionType } from "@shared/types/wallet";

const SUBMIT_EXERCISE_LABELS = {
	reverse_translation: "Dịch ngược",
	rewrite: "Viết lại câu",
	slang_hang: "Hội thoại",
	see_and_write: "Quan sát và viết",
} as const;

type SubmitExerciseKey = keyof typeof SUBMIT_EXERCISE_LABELS;

/** Class Tailwind cho badge theo loại giao dịch (4 loại chính). */
export const TRANSACTION_TYPE_BADGE_CLASS: Partial<
	Record<TransactionType, string>
> = {
	signup_bonus: "bg-emerald-100 text-emerald-600",
	purchase_pack: "bg-cyan-100 text-cyan-600",
	charge_submit: "bg-amber-100 text-amber-600",
	refund_ai_fail: "bg-green-100 text-green-600",
};

const SUBMIT_REASON_RE = /^submit\s+(\w+)(?:\s|\/)/;

/**
 * Dịch chuỗi reason từ server sang tiếng Việt theo loại giao dịch.
 * @param type — loại giao dịch
 * @param reason — mô tả thô từ API
 * @returns Chuỗi hiển thị cho cột Mô tả
 */
export function translateTransactionReason(
	type: TransactionType,
	reason: string,
): string {
	switch (type) {
		case "signup_bonus":
			return "Thưởng đăng ký";
		case "purchase_pack":
			return "Thanh toán gói";
		case "refund_ai_fail":
			return "Hoàn tiền do phát sinh lỗi";
		case "charge_submit": {
			const match = reason.match(SUBMIT_REASON_RE);
			const exerciseKey = match?.[1] as SubmitExerciseKey | undefined;
			if (exerciseKey && exerciseKey in SUBMIT_EXERCISE_LABELS) {
				return `Nộp bài dạng ${SUBMIT_EXERCISE_LABELS[exerciseKey]}`;
			}
			return reason;
		}
		default:
			return reason;
	}
}

/**
 * Định dạng thời gian giao dịch: HH:mm dd/MM/yyyy (24h).
 * @param iso — chuỗi ISO từ API
 * @returns Chuỗi hiển thị
 */
export function formatTransactionDateTime(iso: string): string {
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
 * Định dạng khối lượng xu kèm dấu +/-.
 * @param amount — số xu (âm = trừ, dương = cộng)
 * @returns Chuỗi hiển thị
 */
export function formatTransactionAmount(amount: number): string {
	if (amount > 0) return `+${amount}`;
	return String(amount);
}
