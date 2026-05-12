import type {
	SAWListQueryParams,
	SAWListResponse,
} from "@shared/types/see-and-write";
import { axiosPrivate } from "@shared/api/axios-client";

export const fetchSAWList = async (
	params?: SAWListQueryParams,
): Promise<SAWListResponse> => {
	const { data } = await axiosPrivate.get<SAWListResponse>(
		"/writing/see-and-write",
		{ params },
	);
	return data;
};
