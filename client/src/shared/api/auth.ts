import { axiosPublic, axiosPrivate } from "./axios-client";
import type {
	SignInPayload,
	SignInResponse,
	User,
	APIResponse,
	SignUpPayload,
} from "@/shared/types/auth";

export const signIn = async (
	payload: SignInPayload,
): Promise<SignInResponse> => {
	const { data } = await axiosPublic.post<SignInResponse>(
		"/auth/signin",
		payload,
	);
	return data;
};

export const signUp = async (
	payload: SignUpPayload,
): Promise<APIResponse<User>> => {
	const { data } = await axiosPublic.post<APIResponse<User>>(
		"/auth/signup",
		payload,
	);
	return data;
};

export const signOut = async (): Promise<void> => {
	await axiosPrivate.post<void>("/auth/signout");
};

export const fetchMe = async (): Promise<User> => {
	const { data } = await axiosPrivate.get<APIResponse<User>>("/me");
	return data.data;
};
