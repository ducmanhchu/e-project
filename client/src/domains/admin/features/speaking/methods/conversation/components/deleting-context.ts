import { createContext, useContext } from "react";

export const ConversationDeletingIdContext = createContext<string | undefined>(
	undefined,
);

/** @returns id bài tập đang xóa (nếu có) */
export function useConversationDeletingId() {
	return useContext(ConversationDeletingIdContext);
}
