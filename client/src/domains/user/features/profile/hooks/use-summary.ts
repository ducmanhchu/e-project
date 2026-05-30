import { useQuery } from "@tanstack/react-query";

import { fetchSummary } from "@/shared/api/progress";
import { useAuthStore } from "@/shared/store/use-auth-store";

/**
 * Lấy tổng quan tiến trình học (streak, writing/slang stats).
 * @returns React Query result với SummaryResponse
 */
export function useSummary() {
	const accessToken = useAuthStore((s) => s.accessToken);

	return useQuery({
		queryKey: ["profile", "summary"],
		queryFn: async () => {
			const res = await fetchSummary();
			return res.data;
		},
		enabled: !!accessToken,
		staleTime: 2 * 60 * 1000,
	});
}
