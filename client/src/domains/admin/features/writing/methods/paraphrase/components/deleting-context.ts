import { createContext, useContext } from "react";

export const ParaphraseDeletingIdContext = createContext<string | undefined>(
	undefined,
);

/** @returns id bài tập đang xóa (nếu có) */
export function useParaphraseDeletingId() {
	return useContext(ParaphraseDeletingIdContext);
}
