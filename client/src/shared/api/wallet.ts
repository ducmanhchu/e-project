import type { Transaction, TransactionType } from "@shared/types/wallet";
import type { APIResponse } from "@shared/types/utils";
import { axiosPrivate } from "@shared/lib/axios-instances";

export type TransactionsListData = {
	items: Transaction[];
	page: number;
	limit: number;
	total: number;
};

export const listTransactions = async (params?: {
	page?: number;
	limit?: number;
	type?: TransactionType;
}): Promise<APIResponse<TransactionsListData>> => {
	const { data } = await axiosPrivate.get<APIResponse<TransactionsListData>>(
		"/me/credits/transactions",
		{ params },
	);
	return data;
};

export const getWalletBalance = async (): Promise<
	APIResponse<{
		credits: number;
	}>
> => {
	const { data } = await axiosPrivate.get<
		APIResponse<{
			credits: number;
		}>
	>("/me/credits");
	return data;
};
