import type { ReactNode } from "react";

import { SAWDeletingIdContext } from "@admin/features/writing/methods/see-and-write/components/deleting-context";

type SAWDeletingIdProviderProps = {
	deletingId?: string;
	children: ReactNode;
};

/**
 * Cung cấp id dòng đang xóa cho cột actions — tránh recreate toàn bộ columns khi mutation pending.
 */
export function SAWDeletingIdProvider({
	deletingId,
	children,
}: SAWDeletingIdProviderProps) {
	return (
		<SAWDeletingIdContext.Provider value={deletingId}>
			{children}
		</SAWDeletingIdContext.Provider>
	);
}
