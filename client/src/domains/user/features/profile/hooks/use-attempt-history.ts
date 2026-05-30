import { useQuery } from "@tanstack/react-query";

import { fetchAttemptHistory } from "@/shared/api/profile";
import type { AttemptHistoryParams } from "@/shared/types/profile";
import { useAuthStore } from "@/shared/store/use-auth-store";

/**
 * Lấy lịch sử làm bài theo bộ lọc kỹ năng.
 * @param feature — all | writing | slanghang
 * @returns React Query result với danh sách AttemptHistoryItem
 */
export function useAttemptHistory(
	feature: AttemptHistoryParams["feature"] = "all",
) {
	const accessToken = useAuthStore((s) => s.accessToken);

	return useQuery({
		queryKey: ["profile", "attempt-history", feature],
		queryFn: async () => {
			const res = await fetchAttemptHistory({ feature });
			return res.data;
		},
		enabled: !!accessToken,
		staleTime: 2 * 60 * 1000,
	});
}
