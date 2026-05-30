import { axiosPublic } from "@shared/lib/axios-instances";
import { useAuthStore } from "@/shared/store/use-auth-store";
import type { RefreshResponse } from "@/shared/types/auth";

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			const { data } = await axiosPublic.post<RefreshResponse>(
				"/auth/refresh",
				null,
				{ withCredentials: true },
			);

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
