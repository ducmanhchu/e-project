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
	googleId?: string;
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

export type ForgotPasswordPayload = { email: string };
export type ForgotPasswordResponse = { success: boolean; message: string };

export type ResetPasswordPayload = {
	token: string;
	newPassword: string;
	confirmPassword: string;
};
export type ResetPasswordResponse = { success: boolean; message: string };

export type GoogleLoginPayload = {
	idToken: string;
};
export type GoogleLoginResponse = {
	success: boolean;
	accessToken: string;
	isNewUser: boolean;
};
