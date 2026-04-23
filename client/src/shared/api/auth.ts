import { axiosPublic, axiosPrivate } from "./axios-client";
import type {
	SignInPayload,
	SignInResponse,
	User,
	APIResponse,
} from "@/shared/types/auth";

const baseURL = import.meta.env.VITE_BASE_URL;

export const signIn = async (
	payload: SignInPayload,
): Promise<SignInResponse> => {
	const { data } = await axiosPublic.post<SignInResponse>(
		`${baseURL}/auth/signin`,
		payload,
	);
	return data;
};

export const fetchMe = async (): Promise<User> => {
	const { data } = await axiosPrivate.get<APIResponse<User>>(`${baseURL}/me`);
	return data.data;
};
