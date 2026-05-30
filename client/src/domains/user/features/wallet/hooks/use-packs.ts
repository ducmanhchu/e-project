import { useQuery } from "@tanstack/react-query";

import { listPacks } from "@shared/api/payment";

const PACKS_STALE_TIME = 1000 * 60 * 5;

/**
 * Lấy catalog gói xu — chỉ fetch khi dialog mở để tránh request thừa.
 * @param enabled — bật query (thường gắn với trạng thái open của dialog)
 * @returns Query catalog gói và cấu hình custom
 */
export function usePacks(enabled: boolean) {
	return useQuery({
		queryKey: ["payment", "packs"],
		queryFn: listPacks,
		enabled,
		staleTime: PACKS_STALE_TIME,
		select: (res) => res.data,
	});
}
