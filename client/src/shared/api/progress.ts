import type {
	AttemptHistoryParams,
	AttemptHistoryItem,
	SummaryResponse,
	AdminSummaryParams,
	AdminSummaryResponse,
} from "@/shared/types/progress";
import type { APIResponse } from "@shared/types/utils";
import { axiosPrivate } from "@shared/lib/axios-instances";

export const fetchAttemptHistory = async (
	params?: AttemptHistoryParams,
): Promise<APIResponse<AttemptHistoryItem[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<AttemptHistoryItem[]>>(
		"/me/progress/history/attempts",
		{ params },
	);
	return data;
};

export const fetchSummary = async (): Promise<APIResponse<SummaryResponse>> => {
	const { data } = await axiosPrivate.get<APIResponse<SummaryResponse>>(
		"/me/progress/summary",
	);
	return data;
};

export const fetchAdminSummary = async (
	params?: AdminSummaryParams,
): Promise<APIResponse<AdminSummaryResponse>> => {
	const { data } = await axiosPrivate.get<APIResponse<AdminSummaryResponse>>(
		"/admin/stats/overview",
		{ params },
	);
	return data;
};
