import { useQuery } from "@tanstack/react-query";

import type { AzureToken } from "@shared/types/conversation";
import { getConversationToken } from "@shared/api/conversation";

const EXPIRY_BUFFER_MS = 60_000;
const STALE_TIME = 8 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

export function useAzureToken(enabled = true) {
	return useQuery({
		queryKey: ["conversation", "azure-token"],
		queryFn: async () => {
			const res = await getConversationToken();
			return res.data;
		},
		enabled,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		refetchOnWindowFocus: false,
	});
}

export async function ensureAzureToken(
	current: AzureToken | undefined,
	refetch: () => Promise<{ data: AzureToken | undefined }>,
): Promise<AzureToken> {
	if (current && current.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
		return current;
	}
	const result = await refetch();
	if (!result.data) {
		throw new Error("Không thể lấy token Azure Speech.");
	}
	return result.data;
}
