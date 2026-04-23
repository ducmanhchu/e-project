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

export type APIResponse<T> = {
	data: T;
	success: boolean;
};

export type SignInPayload = {
	email: string;
	password: string;
};

export type SignInResponse = {
	accessToken: string;
	success: boolean;
};

export type RefreshResponse = SignInResponse;
