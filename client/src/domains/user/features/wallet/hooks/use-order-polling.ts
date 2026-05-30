import { useQuery } from "@tanstack/react-query";

import { getOrderStatus } from "@shared/api/payment";
import type { PaymentStatus } from "@shared/types/payment";

const POLL_INTERVAL_MS = 4_000;

const TERMINAL_STATUSES: PaymentStatus[] = ["paid", "expired", "cancelled"];

/**
 * Poll trạng thái đơn hàng cho đến khi paid/expired/cancelled hoặc hết hạn.
 * @param orderCode — mã đơn cần theo dõi
 * @param enabled — bật polling (step QR và có orderCode)
 * @returns Query trạng thái đơn
 */
export function useOrderPolling(orderCode: number | null, enabled: boolean) {
	return useQuery({
		queryKey: ["payment", "order", orderCode],
		queryFn: () => getOrderStatus(orderCode as number),
		enabled: enabled && orderCode !== null,
		select: (res) => res.data,
		refetchInterval: (query) => {
			const order = query.state.data?.data;
			if (!order) return POLL_INTERVAL_MS;

			if (TERMINAL_STATUSES.includes(order.status)) return false;

			const expiresAt = new Date(order.expiresAt);
			if (expiresAt.getTime() <= Date.now()) return false;

			return POLL_INTERVAL_MS;
		},
	});
}
