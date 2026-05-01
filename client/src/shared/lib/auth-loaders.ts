import { redirect, type LoaderFunction } from "react-router";

import { axiosPrivate } from "@/shared/api/axios-client";
import { fetchMe, signOut } from "@/shared/api/auth";
import { queryClient } from "@/shared/lib/query-client";
import { useAuthStore } from "@/shared/store/use-auth-store";
import type { RefreshResponse } from "@/shared/types/auth";

let refreshPromise: Promise<string | null> | null = null;

async function ensureAccessToken(): Promise<string | null> {
	const { accessToken } = useAuthStore.getState();
	if (accessToken) return accessToken;

	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			const { data } =
				await axiosPrivate.post<RefreshResponse>("/auth/refresh");
			if (data?.accessToken) {
				useAuthStore.getState().setAccessToken(data.accessToken);
				return data.accessToken;
			}
			useAuthStore.getState().clearAuth();
			return null;
		} catch {
			useAuthStore.getState().clearAuth();
			return null;
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

export const rootAuthLoader: LoaderFunction = async () => {
	await ensureAccessToken();
	return null;
};

export const requireAuthLoader: LoaderFunction = async () => {
	const token = await ensureAccessToken();
	if (!token) {
		throw redirect("/login");
	}
	return null;
};

export const requireAdminLoader: LoaderFunction = async () => {
	const token = await ensureAccessToken();

	if (!token) {
		throw redirect("/admin/login");
	}

	try {
		const me = await queryClient.ensureQueryData({
			queryKey: ["auth", "me"],
			queryFn: fetchMe,
			staleTime: 5 * 60 * 1000,
		});

		if (me.role !== "admin") {
			useAuthStore.getState().clearAuth();
			queryClient.removeQueries({ queryKey: ["auth", "me"] });
			await signOut().catch(() => {});
			throw redirect("/admin/login?forbidden=1");
		}

		return null;
	} catch (error) {
		if (error instanceof Response) throw error;

		useAuthStore.getState().clearAuth();
		queryClient.removeQueries({ queryKey: ["auth", "me"] });
		throw redirect("/admin/login");
	}
};
