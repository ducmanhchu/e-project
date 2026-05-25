import type {
	ConversationExercise,
	ConversationListQueryParams,
	ConversationListResponse,
	ConversationToken,
	ConversationSubmitPayload,
	ConversationSubmitResponse,
} from "@shared/types/conversation";
import type { APIResponse } from "@shared/types/utils";

import { axiosPrivate } from "@shared/lib/axios-instances";

// List + Exercise
export const fetchConversationList = async (
	params?: ConversationListQueryParams,
): Promise<ConversationListResponse> => {
	const { data } = await axiosPrivate.get<ConversationListResponse>(
		"/slang-hang/dialogues",
		{ params },
	);
	return data;
};

export const getConversationExercise = async (
	id: string,
): Promise<APIResponse<ConversationExercise>> => {
	const { data } = await axiosPrivate.get<APIResponse<ConversationExercise>>(
		`/slang-hang/dialogues/${id}`,
	);
	return data;
};

// Azure
export const getConversationToken = async (): Promise<ConversationToken> => {
	const { data } = await axiosPrivate.get<ConversationToken>(
		"/slang-hang/azure-token",
	);
	return data;
};

// Server submission
export const submitConversation = async (
	id: string,
	payload: ConversationSubmitPayload,
): Promise<ConversationSubmitResponse> => {
	const { data } = await axiosPrivate.post<ConversationSubmitResponse>(
		`/slang-hang/dialogues/${id}/submit`,
		payload,
	);
	return data;
};

export const resetConversationExercise = async (
	id: string,
): Promise<{ success: boolean }> => {
	const { data } = await axiosPrivate.post<{ success: boolean }>(
		`/slang-hang/dialogues/${id}/retry`,
	);
	return data;
};
