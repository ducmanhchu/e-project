import { createContext, useContext } from "react";

export const SAWDeletingIdContext = createContext<string | undefined>(
	undefined,
);

/** @returns id bài tập đang xóa (nếu có) */
export function useSAWDeletingId() {
	return useContext(SAWDeletingIdContext);
}
