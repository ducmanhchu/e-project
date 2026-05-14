import axios, { type AxiosInstance } from "axios";

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
