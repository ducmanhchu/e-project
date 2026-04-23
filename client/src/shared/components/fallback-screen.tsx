import { Logo } from "@/shared/components/logo";

export const FallbackScreen = () => {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className="bg-background flex h-screen w-full items-center justify-center"
		>
			<Logo className="h-14 w-28 animate-pulse animation-duration-[2.4s]" />
			<span className="sr-only">Đang tải ứng dụng...</span>
		</div>
	);
};
