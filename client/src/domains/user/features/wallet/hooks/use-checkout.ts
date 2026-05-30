import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { checkoutCustom, checkoutPack } from "@shared/api/payment";
import type { CheckoutPayload, CheckoutResult } from "@shared/types/payment";

/**
 * Mutation tạo đơn checkout (gói cố định hoặc số tiền tùy ý).
 * @returns Mutation trả CheckoutResult khi thành công
 */
export function useCheckout() {
	return useMutation({
		mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
			if (payload.type === "pack") {
				const res = await checkoutPack(payload.packId);
				return res.data;
			}
			const res = await checkoutCustom(payload.amount);
			return res.data;
		},
		onError: (error) => {
			if (isAxiosError(error)) {
				const message = error.response?.data?.error as string | undefined;
				if (message?.includes("INVALID_PACK")) {
					toast.error("Gói xu không hợp lệ");
					return;
				}
				if (message?.includes("AMOUNT_OUT_OF_RANGE")) {
					toast.error("Số tiền nằm ngoài phạm vi cho phép");
					return;
				}
			}
			toast.error("Không thể tạo đơn thanh toán");
		},
	});
}
