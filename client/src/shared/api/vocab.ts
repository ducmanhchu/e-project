import type {
	WordListQueryParams,
	WordListResponse,
} from "@shared/types/vocab";
import { axiosPrivate } from "@shared/lib/axios-instances";

export const fetchWordList = async (
	params?: WordListQueryParams,
): Promise<WordListResponse> => {
	const { data } = await axiosPrivate.get<WordListResponse>("/vocabulary", {
		params,
	});
	return data;
};
