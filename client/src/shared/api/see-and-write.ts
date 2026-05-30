import type { APIResponse } from "@shared/types/utils";
import type {
	SAWExercise,
	SAWListQueryParams,
	SAWListResponse,
	KeywordSubmitPayload,
	KeywordSubmitResponse,
	ParagraphSubmitPayload,
	ParagraphSubmitResponse,
	SAWAdminListQueryParams,
	SAWAdminListItem,
	SAWExerciseCreatePayload,
	SAWExerciseUpdatePayload,
	SAWAdminExercise,
} from "@shared/types/see-and-write";
import { axiosPrivate } from "@shared/lib/axios-instances";
import { SUBMIT_TIMEOUT_MS } from "@shared/lib/utils";

export const fetchSAWList = async (
	params?: SAWListQueryParams,
): Promise<SAWListResponse> => {
	const { data } = await axiosPrivate.get<SAWListResponse>(
		"/writing/see-and-write",
		{ params },
	);
	return data;
};

export const fetchSAWExercise = async (
	id: string,
): Promise<APIResponse<SAWExercise>> => {
	const { data } = await axiosPrivate.get<APIResponse<SAWExercise>>(
		`/writing/see-and-write/${id}`,
	);
	return data;
};

export const submitKeyword = async (
	id: string,
	payload: KeywordSubmitPayload,
): Promise<KeywordSubmitResponse> => {
	const { data } = await axiosPrivate.post<KeywordSubmitResponse>(
		`/writing/see-and-write/${id}/check-keywords`,
		payload,
		{ timeout: SUBMIT_TIMEOUT_MS },
	);
	return data;
};

export const submitParagraph = async (
	id: string,
	payload: ParagraphSubmitPayload,
): Promise<ParagraphSubmitResponse> => {
	const { data } = await axiosPrivate.post<ParagraphSubmitResponse>(
		`/writing/see-and-write/${id}/submit`,
		payload,
		{ timeout: SUBMIT_TIMEOUT_MS },
	);
	return data;
};

// ADMIN
export const fetchSAWAdminList = async (
	params?: SAWAdminListQueryParams,
): Promise<APIResponse<SAWAdminListItem[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<SAWAdminListItem[]>>(
		"/admin/writing/see-and-write",
		{ params },
	);
	return data;
};

export const fetchSAWAdminExercise = async (
	id: string,
): Promise<APIResponse<SAWAdminExercise>> => {
	const { data } = await axiosPrivate.get<APIResponse<SAWAdminExercise>>(
		`/admin/writing/see-and-write/${id}`,
	);
	return data;
};

// Max size: 10MB
export const uploadSAWImage = async (
	file: File,
): Promise<
	APIResponse<{
		url: string;
		publicId: string;
		resourceType: "image" | "video";
	}>
> => {
	const { data } = await axiosPrivate.postForm<
		APIResponse<{
			url: string;
			publicId: string;
			resourceType: "image" | "video";
		}>
	>("/admin/upload", {
		file,
	});
	return data;
};

export const createSAWExercise = async (
	payload: SAWExerciseCreatePayload,
): Promise<
	APIResponse<{
		id: string;
		title: string;
	}>
> => {
	const { data } = await axiosPrivate.post<
		APIResponse<{
			id: string;
			title: string;
		}>
	>("/admin/writing/see-and-write", payload);
	return data;
};

export const updateSAWExercise = async (
	id: string,
	payload: SAWExerciseUpdatePayload,
): Promise<
	APIResponse<{
		id: string;
		title: string;
	}>
> => {
	const { data } = await axiosPrivate.put<
		APIResponse<{
			id: string;
			title: string;
		}>
	>(`/admin/writing/see-and-write/${id}`, payload);
	return data;
};

export const deleteSAWExercise = async (
	id: string,
): Promise<APIResponse<{ id: string }>> => {
	const { data } = await axiosPrivate.delete<APIResponse<{ id: string }>>(
		`/admin/writing/see-and-write/${id}`,
	);
	return data;
};

export const bulkDeleteSAWExercises = async (
	ids: string,
): Promise<{ success: boolean; deleted: number }> => {
	const { data } = await axiosPrivate.delete<{
		success: boolean;
		deleted: number;
	}>("/admin/writing/see-and-write", { params: { ids } });
	return data;
};
