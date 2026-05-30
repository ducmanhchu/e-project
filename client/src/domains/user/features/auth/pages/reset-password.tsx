import { ResetPasswordForm } from "@user/features/auth/components/reset-password-form";

export function ResetPassword() {
	return (
		<div className="flex flex-col min-h-svh items-center justify-center px-6 md:px-0">
			<ResetPasswordForm className="w-full max-w-sm" />
		</div>
	);
}

