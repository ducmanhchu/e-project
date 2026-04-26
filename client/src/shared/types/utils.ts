import type { User } from "./auth";

export type BackgroundIllustration = {
	src: string;
	className: string;
	rotate: number;
	delay: number;
};

export type HeaderContentProps = {
	me?: User;
	isLoading: boolean;
	onLogout: () => void;
};
