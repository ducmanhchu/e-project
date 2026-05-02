import type { User } from "./auth";

export type HeaderContentProps = {
	me?: User;
	isLoading: boolean;
	onLogout: () => void;
};

export type APIResponse<T> = {
	data: T;
	success: boolean;
};
