import { axiosPrivate } from "./axios-client";
import type {
	ReverseTranslateListResponse,
	ReverseTranslateQueryParams,
} from "@shared/types/reverse-translate";

export const fetchReverseTranslateList = async (
	params?: ReverseTranslateQueryParams,
): Promise<ReverseTranslateListResponse> => {
	const { data } = await axiosPrivate.get<ReverseTranslateListResponse>(
		"/writing/reverse-translation",
		{ params },
	);
	return data;
};
