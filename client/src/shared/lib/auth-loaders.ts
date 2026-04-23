import { redirect, type LoaderFunction } from "react-router";

import { axiosPrivate } from "@/shared/api/axios-client";
import { useAuthStore } from "@/shared/store/use-auth-store";
import type { RefreshResponse } from "@/shared/types/auth";

const baseURL = import.meta.env.VITE_BASE_URL;

export const rootAuthLoader: LoaderFunction = async () => {
	const { accessToken, setAccessToken, clearAuth } = useAuthStore.getState();

	if (accessToken) return null;

	try {
		const { data } = await axiosPrivate.post<RefreshResponse>(
			`${baseURL}/auth/refresh`,
		);
		if (data?.accessToken) {
			setAccessToken(data.accessToken);
		} else {
			clearAuth();
		}
	} catch {
		clearAuth();
	}

	return null;
};

export const requireAuthLoader: LoaderFunction = () => {
	const { accessToken } = useAuthStore.getState();
	if (!accessToken) {
		throw redirect("/login");
	}
	return null;
};
