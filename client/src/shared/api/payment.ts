import { axiosPrivate } from "@shared/lib/axios-instances";
import type {
	CheckoutResult,
	OrderStatus,
	PacksCatalog,
} from "@shared/types/payment";
import type { APIResponse } from "@shared/types/utils";

/**
 * Lấy danh sách gói xu và cấu hình nạp tùy ý.
 * @returns Catalog gói và giới hạn số tiền custom
 */
export const listPacks = async (): Promise<APIResponse<PacksCatalog>> => {
	const { data } =
		await axiosPrivate.get<APIResponse<PacksCatalog>>("/payments/packs");
	return data;
};

/**
 * Tạo đơn thanh toán theo gói cố định.
 * @param packId — id gói (tier1–tier4)
 * @returns Thông tin QR và mã đơn
 */
export const checkoutPack = async (
	packId: string,
): Promise<APIResponse<CheckoutResult>> => {
	const { data } = await axiosPrivate.post<APIResponse<CheckoutResult>>(
		"/payments/checkout",
		{ packId },
	);
	return data;
};

/**
 * Tạo đơn thanh toán với số tiền tùy ý (VND, integer).
 * @param amount — số tiền VND
 * @returns Thông tin QR và mã đơn
 */
export const checkoutCustom = async (
	amount: number,
): Promise<APIResponse<CheckoutResult>> => {
	const { data } = await axiosPrivate.post<APIResponse<CheckoutResult>>(
		"/payments/checkout/custom",
		{ amount },
	);
	return data;
};

/**
 * Tra cứu trạng thái đơn hàng (dùng cho polling sau khi quét QR).
 * @param orderCode — mã đơn trả về từ checkout
 * @returns Trạng thái đơn và snapshot gói
 */
export const getOrderStatus = async (
	orderCode: number,
): Promise<APIResponse<OrderStatus>> => {
	const { data } = await axiosPrivate.get<APIResponse<OrderStatus>>(
		`/payments/orders/${orderCode}`,
	);
	return data;
};
