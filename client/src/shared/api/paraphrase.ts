import type {
	ParaphraseListQueryParams,
	ParaphraseListResponse,
	ParaphraseSubmitPayload,
	ParaphraseSubmitResponse,
	ParaphraseExerciseResponse,
} from "@shared/types/paraphrase";
import { axiosPrivate } from "@shared/lib/axios-instances";
import { SUBMIT_TIMEOUT_MS } from "@shared/lib/utils";

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
