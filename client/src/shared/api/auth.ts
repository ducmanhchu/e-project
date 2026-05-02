import { axiosPublic, axiosPrivate } from "./axios-client";
import type {
	SignInPayload,
	SignInResponse,
	User,
	SignUpPayload,
	ChangePasswordPayload,
	ChangePasswordResponse,
	VerifyEmailPayload,
	VerifyEmailResponse,
	ResendVerificationPayload,
	ResendVerificationResponse,
} from "@shared/types/auth";
import type { APIResponse } from "@shared/types/utils";

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

export const verifyEmail = async (
	payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> => {
	const { data } = await axiosPublic.post<VerifyEmailResponse>(
		"/auth/verify-email",
		payload,
	);
	return data;
};

export const resendVerification = async (
	payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> => {
	const { data } = await axiosPublic.post<ResendVerificationResponse>(
		"/auth/resend-verification",
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

export const changePassword = async (
	payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> => {
	const { data } = await axiosPrivate.post<ChangePasswordResponse>(
		"/auth/change-password",
		payload,
	);
	return data;
};
