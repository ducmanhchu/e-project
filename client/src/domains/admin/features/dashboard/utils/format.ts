import type { GrowthRange } from "@admin/features/dashboard/hooks/use-admin-summary";

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
 * Định dạng số nguyên (lượng giao dịch, người dùng).
 * @param value — giá trị cần hiển thị
 * @returns Chuỗi đã format theo locale vi-VN
 */
export function formatCount(value: number): string {
	return new Intl.NumberFormat("vi-VN").format(value);
}

/**
 * Rút gọn nhãn trục X theo bucket tuần/tháng/toàn thời gian.
 * @param periodStart — ISO date từ API
 * @param range — khoảng lọc hiện tại
 * @returns Nhãn ngắn cho trục biểu đồ
 */
export function formatPeriodLabel(
	periodStart: string,
	range: GrowthRange,
): string {
	const date = new Date(periodStart);
	if (Number.isNaN(date.getTime())) return periodStart;

	if (range === "week") {
		return new Intl.DateTimeFormat("vi-VN", {
			day: "numeric",
			month: "short",
		}).format(date);
	}

	return new Intl.DateTimeFormat("vi-VN", {
		month: "short",
		year: range === "all" ? "numeric" : undefined,
	}).format(date);
}
