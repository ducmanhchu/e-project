import { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { refreshAccessToken } from "@/shared/lib/refresh-token";
import { useAuthStore } from "@/shared/store/use-auth-store";
import { axiosPrivate } from "@shared/lib/axios-instances";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
	_retry?: boolean;
}

export function axiosInterceptors(): void {
	axiosPrivate.interceptors.request.use((config) => {
		const token = useAuthStore.getState().accessToken;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	});

	axiosPrivate.interceptors.response.use(
		(response) => response,
		async (error: AxiosError) => {
			const originalRequest = error.config as
				| RetriableRequestConfig
				| undefined;

			if (
				!originalRequest ||
				(error.response?.status !== 401 && error.response?.status !== 403) ||
				originalRequest._retry
			) {
				return Promise.reject(error);
			}

			originalRequest._retry = true;

			const newToken = await refreshAccessToken();
			if (!newToken) {
				return Promise.reject(error);
			}

			originalRequest.headers.Authorization = `Bearer ${newToken}`;
			return axiosPrivate(originalRequest);
		},
	);
}
