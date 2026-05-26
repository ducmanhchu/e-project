import type {
	ConversationExercise,
	ConversationListQueryParams,
	ConversationListResponse,
	ConversationToken,
	ConversationSubmitPayload,
	ConversationSubmitResponse,
	AdminConversationListItem,
	AdminConversationListParams,
	AdminConversationDetail,
	CreateAdminConversationPayload,
	UpdateAdminConversationPayload,
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

// ADMIN
export const fetchAdminConversationList = async (
	params?: AdminConversationListParams,
): Promise<APIResponse<AdminConversationListItem[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<AdminConversationListItem[]>>(
		`/admin/slang-hang/dialogues`,
		{ params },
	);
	return data;
};

export const deleteAdminConversation = async (id: string): Promise<{ success: boolean }> => {
	const { data } = await axiosPrivate.delete<{ success: boolean }>(
		`/admin/slang-hang/dialogues/${id}`,
	);
	return data;
}

export const bulkDeleteAdminConversation = async (ids: string): Promise<{ success: boolean; deleted: number }> => {
	const { data } = await axiosPrivate.delete<{ success: boolean; deleted: number }>(
		`/admin/slang-hang/dialogues`,
		{ params: { ids } },
	);
	return data;
};

export const fetchAdminConversation = async (
	id: string,
): Promise<APIResponse<AdminConversationDetail>> => {
	const { data } = await axiosPrivate.get<APIResponse<AdminConversationDetail>>(
		`/admin/slang-hang/dialogues/${id}`,
	);
	return data;
};

export const createAdminConversation = async (
	payload: CreateAdminConversationPayload,
): Promise<APIResponse<AdminConversationDetail>> => {
	const { data } = await axiosPrivate.post<APIResponse<AdminConversationDetail>>(
		`/admin/slang-hang/dialogues`,
		payload,
	);
	return data;
};

export const updateAdminConversation = async (
	id: string,
	payload: UpdateAdminConversationPayload,
): Promise<APIResponse<AdminConversationDetail>> => {
	const { data } = await axiosPrivate.put<APIResponse<AdminConversationDetail>>(
		`/admin/slang-hang/dialogues/${id}`,
		payload,
	);
	return data;
};