import type { APIResponse } from "@shared/types/utils";
import type {
	SAWExercise,
	SAWListQueryParams,
	SAWListResponse,
	KeywordSubmitPayload,
	KeywordSubmitResponse,
	ParagraphSubmitPayload,
	ParagraphSubmitResponse,
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
