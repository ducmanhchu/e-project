import type {
	AdminRTListItem,
	AdminRTListParams,
	AdminRTExercise,
	ReverseTranslateListResponse,
	ReverseTranslateQueryParams,
	RTCreatePayload,
	RTCreateResponse,
	RTDictionaryEntry,
	RTDictionaryResponse,
	RTExerciseResponse,
	RTExerciseSubmitPayload,
	RTExerciseSubmitResponse,
	RTPreviewPayload,
	RTPreviewResponse,
	RTUpdatePayload,
	RTUpdateResponse,
} from "@shared/types/reverse-translate";

import { axiosPrivate } from "@shared/lib/axios-instances";
import { SUBMIT_TIMEOUT_MS } from "@shared/lib/utils";
import type { APIResponse } from "@shared/types/utils";

export const fetchReverseTranslateList = async (
	params?: ReverseTranslateQueryParams,
): Promise<ReverseTranslateListResponse> => {
	const { data } = await axiosPrivate.get<ReverseTranslateListResponse>(
		"/writing/reverse-translation",
		{ params },
	);
	return data;
};

export const fetchRTExercise = async (
	id: string,
): Promise<RTExerciseResponse> => {
	const { data } = await axiosPrivate.get<RTExerciseResponse>(
		`/writing/reverse-translation/${id}`,
	);
	return data;
};

export const submitRTExercise = async (
	id: string,
	payload: RTExerciseSubmitPayload,
): Promise<RTExerciseSubmitResponse> => {
	const { data } = await axiosPrivate.post<RTExerciseSubmitResponse>(
		`/writing/reverse-translation/${id}/submit`,
		payload,
		{ timeout: SUBMIT_TIMEOUT_MS },
	);
	return data;
};

// ADMIN
export const fetchAdminRTList = async (params?: AdminRTListParams): Promise<APIResponse<AdminRTListItem[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<AdminRTListItem[]>>(
		"/admin/writing/reverse-translation",
		{ params },
	);
	return data;
};

export const fetchAdminRTExercise = async (id: string): Promise<APIResponse<AdminRTExercise>> => {
	const { data } = await axiosPrivate.get<APIResponse<AdminRTExercise>>(
		`/admin/writing/reverse-translation/${id}`,
	);
	return data;
};

export const deleteAdminRTExercise = async (id: string): Promise<APIResponse<{id: string}>> => {
	const { data } = await axiosPrivate.delete<APIResponse<{id: string}>>(
		`/admin/writing/reverse-translation/${id}`,
	);
	return data;
};

export const bulkDeleteAdminRTExercises = async (ids: string): Promise<{success: boolean; deleted: number}> => {
	const { data } = await axiosPrivate.delete<{success: boolean; deleted: number}>(
		"/admin/writing/reverse-translation",
		{ params: { ids } },
	);
	return data;
};

export const previewAdminRTExercise = async (
	payload: RTPreviewPayload,
): Promise<RTPreviewResponse> => {
	const { data } = await axiosPrivate.post<RTPreviewResponse>(
		"/admin/writing/reverse-translation/preview",
		payload,
		{ timeout: SUBMIT_TIMEOUT_MS },
	);
	return data;
};

export const createAdminRTExercise = async (
	payload: RTCreatePayload,
): Promise<RTCreateResponse> => {
	const { data } = await axiosPrivate.post<RTCreateResponse>(
		"/admin/writing/reverse-translation",
		payload,
	);
	return data;
};

export const saveAdminRTDictionary = async (
	lessonId: string,
	entries: RTDictionaryEntry[],
): Promise<RTDictionaryResponse> => {
	const { data } = await axiosPrivate.post<RTDictionaryResponse>(
		`/admin/writing/reverse-translation/${lessonId}/dictionary`,
		entries,
	);
	return data;
};

export const updateAdminRTExercise = async (
	id: string,
	payload: RTUpdatePayload,
): Promise<RTUpdateResponse> => {
	const { data } = await axiosPrivate.put<RTUpdateResponse>(
		`/admin/writing/reverse-translation/${id}`,
		payload,
	);
	return data;
};