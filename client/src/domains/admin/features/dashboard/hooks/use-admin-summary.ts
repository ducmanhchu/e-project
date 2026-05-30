import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAdminSummary } from "@/shared/api/progress";

export type GrowthRange = "week" | "month" | "all";

/**
 * Lấy tổng quan thống kê admin; userGrowth phụ thuộc range, các chỉ số tổng ổn định.
 * @param range — tuần, tháng, hoặc toàn thời gian
 * @returns React Query result với AdminSummaryResponse
 */
export function useAdminSummary(range: GrowthRange) {
	const params =
		range === "all"
			? { allTime: true, groupBy: "month" as const }
			: { groupBy: range };

	return useQuery({
		queryKey: ["admin", "summary", range],
		queryFn: async () => {
			const res = await fetchAdminSummary(params);
			return res.data;
		},
		staleTime: 2 * 60 * 1000,
		placeholderData: keepPreviousData,
	});
}
