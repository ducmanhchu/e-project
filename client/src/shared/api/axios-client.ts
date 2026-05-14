import axios, {
	AxiosError,
	type AxiosInstance,
	type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/shared/store/use-auth-store";
import type { RefreshResponse } from "@/shared/types/auth";

interface QueueItem {
	resolve: (token: string) => void;
	reject: (error: unknown) => void;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
	_retry?: boolean;
}

const baseURL = import.meta.env.VITE_BASE_URL;

export const axiosPublic: AxiosInstance = axios.create({
	baseURL,
	timeout: 10000,
});

export const axiosPrivate: AxiosInstance = axios.create({
	baseURL,
	timeout: 10000,
	withCredentials: true,
});

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null): void => {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error || !token) {
			reject(error);
		} else {
			resolve(token);
		}
	});
	failedQueue = [];
};

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
		const originalRequest = error.config as RetriableRequestConfig | undefined;

		if (
			!originalRequest ||
			(error.response?.status !== 401 && error.response?.status !== 403) ||
			originalRequest._retry ||
			originalRequest.url === `${baseURL}/auth/refresh`
		) {
			return Promise.reject(error);
		}

		if (isRefreshing) {
			return new Promise<string>((resolve, reject) => {
				failedQueue.push({ resolve, reject });
			})
				.then((token) => {
					originalRequest.headers.Authorization = `Bearer ${token}`;
					originalRequest._retry = true;
					return axiosPrivate(originalRequest);
				})
				.catch((queueError) => Promise.reject(queueError));
		}

		originalRequest._retry = true;
		isRefreshing = true;

		try {
			const { data } = await axiosPrivate.post<RefreshResponse>(
				`${baseURL}/auth/refresh`,
			);
			const newToken = data.accessToken;

			useAuthStore.getState().setAccessToken(newToken);
			processQueue(null, newToken);

			originalRequest.headers.Authorization = `Bearer ${newToken}`;
			return axiosPrivate(originalRequest);
		} catch (refreshError) {
			processQueue(refreshError, null);
			useAuthStore.getState().clearAuth();
			return Promise.reject(refreshError);
		} finally {
			isRefreshing = false;
		}
	},
);
