import type { ReactNode } from "react";

import { RTDeletingIdContext } from "@admin/features/writing/methods/reverse-translate/components/deleting-context";

type RTDeletingIdProviderProps = {
	deletingId?: string;
	children: ReactNode;
};

/**
 * Cung cấp id dòng đang xóa cho cột actions — tránh recreate toàn bộ columns khi mutation pending.
 */
export function RTDeletingIdProvider({
	deletingId,
	children,
}: RTDeletingIdProviderProps) {
	return (
		<RTDeletingIdContext.Provider value={deletingId}>
			{children}
		</RTDeletingIdContext.Provider>
	);
}
