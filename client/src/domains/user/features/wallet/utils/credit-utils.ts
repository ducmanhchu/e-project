import type { CreditPack } from "@shared/types/payment";
import type { APIResponse } from "@shared/types/utils";

export type WalletBalanceResponse = APIResponse<{ credits: number }>;

/**
 * Tính % bonus theo bracket giá — mirror server bonusPctForAmount.
 * @param amount — số tiền VND
 * @param packs — danh sách gói làm ngưỡng bonus
 * @returns Phần trăm bonus áp dụng
 */
export function bonusPctForAmount(amount: number, packs: CreditPack[]): number {
	return packs
		.filter((p) => amount >= p.price)
		.reduce((max, p) => Math.max(max, p.bonusPct), 0);
}

/**
 * Preview số xu nhận khi nạp custom — mirror server computeCustomCredits.
 * @param amount — số tiền VND
 * @param vndPerCredit — tỷ giá VND/xu
 * @param packs — danh sách gói làm ngưỡng bonus
 * @returns Số xu sau bonus
 */
export function computeCustomCredits(
	amount: number,
	vndPerCredit: number,
	packs: CreditPack[],
): number {
	const base = amount / vndPerCredit;
	const bonusPct = bonusPctForAmount(amount, packs);
	return Math.round(base * (1 + bonusPct / 100));
}

/**
 * Định dạng số tiền VND cho hiển thị UI.
 * @param amount — số tiền VND
 * @returns Chuỗi đã format theo locale vi-VN
 */
export function formatVnd(amount: number): string {
	return new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
	}).format(amount);
}

/**
 * Parse chuỗi nhập tiền thành integer VND (bỏ dấu phân cách).
 * @param raw — giá trị input thô
 * @returns Số nguyên hoặc null nếu không hợp lệ
 */
export function parseVndInput(raw: string): number | null {
	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	const n = Number.parseInt(digits, 10);
	return Number.isFinite(n) ? n : null;
}

/**
 * Sepay trả URL ảnh VietQR; ZaloPay trả chuỗi EMVCo — phân biệt để chọn cách render.
 * @param value — giá trị qrCode từ API checkout
 * @returns true nếu là URL ảnh (http/https)
 */
export function isQrCodeImageUrl(value: string): boolean {
	return /^https?:\/\//i.test(value.trim());
}

/**
 * Kiểm tra số tiền custom có nằm trong giới hạn cho phép.
 * @param amount — số tiền VND đã parse
 * @param min — tối thiểu
 * @param max — tối đa
 * @returns true nếu hợp lệ
 */
export function isCustomAmountValid(
	amount: number | null,
	min: number,
	max: number,
): amount is number {
	return amount !== null && amount >= min && amount <= max;
}

/**
 * Kiểm tra user không đủ xu để thực hiện thao tác trừ phí (submit, v.v.).
 * @param balance — response GET /me/credits; undefined/null khi chưa load → không chặn
 * @returns true khi đã có số dư và credits ≤ 0
 */
export function hasInsufficientCredits(
	balance: WalletBalanceResponse | null | undefined,
): boolean {
	return balance != null && balance.data.credits <= 0;
}
