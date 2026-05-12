import type {
	ParaphraseListQueryParams,
	ParaphraseListResponse,
} from "@shared/types/paraphrase";
import { axiosPrivate } from "@shared/api/axios-client";

export const fetchParaphraseList = async (
	params?: ParaphraseListQueryParams,
): Promise<ParaphraseListResponse> => {
	const { data } = await axiosPrivate.get<ParaphraseListResponse>(
		"/writing/rewrite",
		{ params },
	);
	return data;
};
