import { createContext, useContext } from "react";

export const RTDeletingIdContext = createContext<string | undefined>(
	undefined,
);

/** @returns id bài tập đang xóa (nếu có) */
export function useRTDeletingId() {
	return useContext(RTDeletingIdContext);
}
