import type {
	ParaphraseListQueryParams,
	ParaphraseListResponse,
	ParaphraseSubmitPayload,
	ParaphraseSubmitResponse,
	ParaphraseExerciseResponse,
	AdminParaphraseListQueryParams,
	AdminParaphraseListItem,
	AdminParaphraseExerciseResponse,
	CreateParaphraseExerciseResponse,
	CreateParaphraseExercisePayload,
	UpdateParaphraseExercisePayload,
	UpdateParaphraseExerciseResponse,
} from "@shared/types/paraphrase";
import { axiosPrivate } from "@shared/lib/axios-instances";
import { SUBMIT_TIMEOUT_MS } from "@shared/lib/utils";
import type { APIResponse } from "../types/utils";

export const fetchParaphraseList = async (
	params?: ParaphraseListQueryParams,
): Promise<ParaphraseListResponse> => {
	const { data } = await axiosPrivate.get<ParaphraseListResponse>(
		"/writing/rewrite",
		{ params },
	);
	return data;
};

export const fetchParaphraseExercise = async (
	id: string,
): Promise<ParaphraseExerciseResponse> => {
	const { data } = await axiosPrivate.get<ParaphraseExerciseResponse>(
		`/writing/rewrite/${id}`,
	);
	return data;
};

export const submitParaphraseSentence = async (
	id: string,
	payload: ParaphraseSubmitPayload,
): Promise<ParaphraseSubmitResponse> => {
	const { data } = await axiosPrivate.post<ParaphraseSubmitResponse>(
		`/writing/rewrite/${id}/submit`,
		payload,
		{ timeout: SUBMIT_TIMEOUT_MS },
	);
	return data;
};

// ADMIN
export const fetchAdminParaphraseList = async (
	params?: AdminParaphraseListQueryParams,
): Promise<APIResponse<AdminParaphraseListItem[]>> => {
	const { data } = await axiosPrivate.get<
		APIResponse<AdminParaphraseListItem[]>
	>(`/admin/writing/rewrite`, { params });
	return data;
};

export const fetchAdminParaphraseExercise = async (
	id: string,
): Promise<AdminParaphraseExerciseResponse> => {
	const { data } = await axiosPrivate.get<AdminParaphraseExerciseResponse>(
		`/admin/writing/rewrite/${id}`,
	);
	return data;
};

export const createParaphraseExercise = async (
	payload: CreateParaphraseExercisePayload,
): Promise<CreateParaphraseExerciseResponse> => {
	const { data } = await axiosPrivate.post<CreateParaphraseExerciseResponse>(
		`/admin/writing/rewrite`,
		payload,
	);
	return data;
};

export const updateParaphraseExercise = async (
	id: string,
	payload: UpdateParaphraseExercisePayload,
): Promise<UpdateParaphraseExerciseResponse> => {
	const { data } = await axiosPrivate.put<UpdateParaphraseExerciseResponse>(
		`/admin/writing/rewrite/${id}`,
		payload,
	);
	return data;
};

export const removeParaphraseExercise = async (
	id: string,
): Promise<APIResponse<{ id: string }>> => {
	const { data } = await axiosPrivate.delete<APIResponse<{ id: string }>>(
		`/admin/writing/rewrite/${id}`,
	);
	return data;
};

export const bulkDeleteParaphraseExercises = async (
	ids: string,
): Promise<{ success: boolean; deleted: number }> => {
	const { data } = await axiosPrivate.delete<{
		success: boolean;
		deleted: number;
	}>("/admin/writing/rewrite", { params: { ids } });
	return data;
};
