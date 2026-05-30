import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/shared/store/use-auth-store";
import { listTransactions } from "@/shared/api/wallet";
import type { TransactionType } from "@shared/types/wallet";

export const TRANSACTIONS_PAGE_SIZE = 20;

type UseTransactionsParams = {
	page: number;
	type?: TransactionType;
};

/**
 * Lấy danh sách giao dịch có phân trang (và lọc loại tuỳ chọn).
 * @param params.page — trang hiện tại (1-based)
 * @param params.type — lọc theo loại; bỏ qua nếu không truyền
 * @returns Query result kèm total, totalPages
 */
export function useTransactions({ page, type }: UseTransactionsParams) {
	const accessToken = useAuthStore((s) => s.accessToken);

	const query = useQuery({
		queryKey: [
			"wallet",
			"transactions",
			{ page, limit: TRANSACTIONS_PAGE_SIZE, type },
		],
		queryFn: () =>
			listTransactions({
				page,
				limit: TRANSACTIONS_PAGE_SIZE,
				...(type ? { type } : {}),
			}),
		placeholderData: keepPreviousData,
		enabled: !!accessToken,
	});

	const data = query.data?.data;
	const total = data?.total ?? 0;
	const limit = data?.limit ?? TRANSACTIONS_PAGE_SIZE;

	return {
		...query,
		items: data?.items ?? [],
		total,
		page: data?.page ?? page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit)),
	};
}
