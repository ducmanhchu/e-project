export type UserRole = "user" | "admin";

export type User = {
	id: string;
	email: string;
	fullName: string;
	avatarUrl?: string;
	role: UserRole;
	isEmailVerified: boolean;
	createdAt: string;
	updatedAt: string;
};

export type SignInPayload = {
	email: string;
	password: string;
};

export type SignInResponse = {
	accessToken: string;
	success: boolean;
};

export type SignUpPayload = {
	email: string;
	password: string;
	fullName: string;
};

export type RefreshResponse = SignInResponse;

export type ChangePasswordPayload = {
	oldPassword: string;
	newPassword: string;
};

export type ChangePasswordResponse = {
	success: boolean;
	message: string;
};

export type VerifyEmailPayload = { token: string };
export type VerifyEmailResponse = { success: boolean; message: string };

export type ResendVerificationPayload = { email: string };
export type ResendVerificationResponse = { success: boolean; message: string };
