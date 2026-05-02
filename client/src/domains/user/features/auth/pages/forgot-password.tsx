import { ForgotPasswordForm } from "@user/features/auth/components/forgot-password-form";

export function ForgotPassword() {
	return (
		<div className="flex flex-col min-h-svh items-center justify-center px-6 md:px-0">
			<ForgotPasswordForm className="w-full max-w-sm" />
		</div>
	);
}

