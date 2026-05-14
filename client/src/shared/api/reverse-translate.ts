import type {
	ReverseTranslateListResponse,
	ReverseTranslateQueryParams,
	RTExerciseResponse,
	RTExerciseSubmitPayload,
	RTExerciseSubmitResponse,
} from "@shared/types/reverse-translate";

import { axiosPrivate } from "@shared/api/axios-client";
import { SUBMIT_TIMEOUT_MS } from "@shared/lib/utils";

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
