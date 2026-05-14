import type {
	ConversationListQueryParams,
	ConversationListResponse,
} from "@shared/types/conversation";

import { axiosPrivate } from "@shared/lib/axios-instances";

export const fetchConversationList = async (
	params?: ConversationListQueryParams,
): Promise<ConversationListResponse> => {
	const { data } = await axiosPrivate.get<ConversationListResponse>(
		"/slang-hang/dialogues",
		{ params },
	);
	return data;
};
