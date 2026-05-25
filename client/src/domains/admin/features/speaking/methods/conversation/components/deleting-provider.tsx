import type { ReactNode } from "react";

import { ConversationDeletingIdContext } from "@admin/features/speaking/methods/conversation/components/deleting-context";

type ConversationDeletingIdProviderProps = {
	deletingId?: string;
	children: ReactNode;
};

/**
 * Cung cấp id dòng đang xóa cho cột actions — tránh recreate toàn bộ columns khi mutation pending.
 */
export function ConversationDeletingIdProvider({
	deletingId,
	children,
}: ConversationDeletingIdProviderProps) {
	return (
		<ConversationDeletingIdContext.Provider value={deletingId}>
			{children}
		</ConversationDeletingIdContext.Provider>
	);
}
