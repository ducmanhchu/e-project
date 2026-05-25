import type { ReactNode } from "react";

import { ParaphraseDeletingIdContext } from "@admin/features/writing/methods/paraphrase/components/deleting-context";

type ParaphraseDeletingIdProviderProps = {
	deletingId?: string;
	children: ReactNode;
};

/**
 * Cung cấp id dòng đang xóa cho cột actions — tránh recreate toàn bộ columns khi mutation pending.
 */
export function ParaphraseDeletingIdProvider({
	deletingId,
	children,
}: ParaphraseDeletingIdProviderProps) {
	return (
		<ParaphraseDeletingIdContext.Provider value={deletingId}>
			{children}
		</ParaphraseDeletingIdContext.Provider>
	);
}
