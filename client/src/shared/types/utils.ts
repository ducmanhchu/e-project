import type { User } from "./auth";

export type HeaderContentProps = {
	me?: User;
	isLoading: boolean;
	onLogout: () => void;
};
